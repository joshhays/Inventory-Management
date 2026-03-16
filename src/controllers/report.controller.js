/**
 * AI-powered report controller.
 * Uses OpenAI to interpret natural language and run report functions.
 */
const OpenAI = require("openai").default;
const reportService = require("../services/report.service");

const CHARTABLE_REPORTS = ["getSalesByPeriod", "getOrdersSummary", "getTopProductsByQuantity", "getLowStockProducts", "getPickTimeStats"];

const REPORT_TOOLS = [
  {
    type: "function",
    function: {
      name: "getOrders",
      description: "Get a list of orders. Use for: pending orders, orders by status, recent orders, orders in date range.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: pending, in process, picked, ready, shipped, cancelled" },
          dateFrom: { type: "string", description: "Start date (ISO or YYYY-MM-DD)" },
          dateTo: { type: "string", description: "End date (ISO or YYYY-MM-DD)" },
          limit: { type: "number", description: "Max orders to return (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getOrdersSummary",
      description: "Get order counts by status and total revenue. Use for: how many orders, revenue summary, orders by status.",
      parameters: {
        type: "object",
        properties: {
          dateFrom: { type: "string", description: "Start date" },
          dateTo: { type: "string", description: "End date" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getSalesByPeriod",
      description: "Get sales totals grouped by day, week, or month. Use for: sales over time, revenue by month.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["day", "week", "month"], description: "Group by day, week, or month" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProducts",
      description: "Get products list. Use for: all products, products by category, inventory list.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Filter by category" },
          lowStockOnly: { type: "boolean", description: "Only products with quantity <= 10" },
          limit: { type: "number", description: "Max products (default 100)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getLowStockProducts",
      description: "Get products with low stock. Use for: what needs reordering, out of stock, low inventory.",
      parameters: {
        type: "object",
        properties: {
          threshold: { type: "number", description: "Quantity threshold (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPickTimeStats",
      description: "Get average picking time for orders. Use for: how long does picking take, pick time stats.",
      parameters: {
        type: "object",
        properties: {
          dateFrom: { type: "string", description: "Start date" },
          dateTo: { type: "string", description: "End date" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getInventoryLogs",
      description: "Get recent inventory changes. Use for: inventory history, audit trail, what changed.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max logs (default 50)" },
          action: { type: "string", description: "Filter by action: adjust, receive, etc." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTopProductsByQuantity",
      description: "Get best-selling products by quantity sold. Use for: top products, best sellers, popular items.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Top N products (default 10)" },
          dateFrom: { type: "string", description: "Start date" },
          dateTo: { type: "string", description: "End date" },
        },
      },
    },
  },
];

const SYSTEM_PROMPT = `You are a helpful report assistant for an inventory and order management system. 
The user can ask for reports in plain English. Use the available tools to fetch data, then format a clear, readable report.
Format numbers nicely (e.g. $1,234.56 for money). Use tables for lists when helpful. Be concise but informative.`;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Retry OpenAI call on 429 rate limit (up to 3 attempts). */
async function withRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err?.status === 429 && attempt < maxAttempts) {
        const waitMs = 2000 * attempt;
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
}

async function chat(req, res, next) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        message: "AI reports are not configured. Add OPENAI_API_KEY to your environment variables.",
      });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages array is required." });
    }

    const openai = new OpenAI({ apiKey });

    const fullMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
        content: m.content || "",
      })),
    ];

    let response = await withRetry(() =>
      openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: fullMessages,
        tools: REPORT_TOOLS,
        tool_choice: "auto",
      })
    );

    let choice = response.choices?.[0];
    const resultMessages = [...messages];
    let lastChartData = null;
    let lastReportConfig = null;

    const REPORT_TITLES = {
      getOrders: "Orders",
      getOrdersSummary: "Orders Summary",
      getSalesByPeriod: "Sales by Period",
      getProducts: "Products",
      getLowStockProducts: "Low Stock Products",
      getPickTimeStats: "Pick Time Stats",
      getInventoryLogs: "Inventory Log",
      getTopProductsByQuantity: "Top Products",
    };

    while (choice?.message?.tool_calls?.length) {
      const toolCalls = choice.message.tool_calls;
      resultMessages.push({
        role: "assistant",
        content: choice.message.content || null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const name = tc.function?.name;
        let args = {};
        try {
          args = JSON.parse(tc.function?.arguments || "{}");
        } catch (_) {}
        let result;
        try {
          result = await reportService.runReport(name, { ...args, deploymentId: req.deploymentId });
        } catch (err) {
          result = { error: err.message };
        }
        if (result && !result.error) {
          lastReportConfig = {
            title: REPORT_TITLES[name] || name,
            reportName: name,
            reportParams: args,
            type: CHARTABLE_REPORTS.includes(name) ? "bar" : "table",
          };
          if (CHARTABLE_REPORTS.includes(name)) {
            const chartConfig = reportService.toChartConfig(name, result);
            if (chartConfig) {
              lastChartData = { ...chartConfig, reportName: name, reportParams: args };
            }
          }
        }
        resultMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      response = await withRetry(() =>
        openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...resultMessages,
          ],
          tools: REPORT_TOOLS,
          tool_choice: "auto",
        })
      );
      choice = response.choices?.[0];
    }

    const content = choice?.message?.content || "I couldn't generate a report for that request.";
    return res.json({
      message: { role: "assistant", content },
      chartData: lastChartData || undefined,
      reportConfig: lastReportConfig || undefined,
      usage: response.usage,
    });
  } catch (error) {
    if (error?.status === 401) {
      return res.status(503).json({ message: "Invalid OpenAI API key." });
    }
    if (error?.status === 429) {
      return res.status(503).json({ message: "OpenAI rate limit. Try again in a moment." });
    }
    next(error);
  }
}

function getConfig(req, res) {
  const configured = !!process.env.OPENAI_API_KEY;
  return res.json({
    configured,
    message: configured
      ? "AI reports ready"
      : "Add OPENAI_API_KEY to enable AI-powered reports.",
  });
}

async function runReport(req, res, next) {
  try {
    const { name, params } = req.query;
    if (!name) {
      return res.status(400).json({ message: "name is required (e.g. getSalesByPeriod)" });
    }
    let parsedParams = {};
    if (params) {
      try {
        parsedParams = JSON.parse(params);
      } catch (_) {
        return res.status(400).json({ message: "params must be valid JSON" });
      }
    }
    const result = await reportService.runReport(name, {
      ...parsedParams,
      deploymentId: req.deploymentId,
    });
    const chartConfig = reportService.toChartConfig(name, result);
    return res.json({
      data: result,
      chartData: chartConfig || undefined,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  chat,
  getConfig,
  runReport,
};
