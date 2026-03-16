/**
 * Available deployments (companies). All use the same backend; each has its own products/orders.
 * Add new customers here as they onboard.
 */
export type Deployment = {
  id: string;       // slug used for API (e.g. atproperties)
  name: string;
  apiBase: string;
  logoUrl?: string;
};

export const DEPLOYMENTS: Deployment[] = [
  {
    id: 'default',
    name: 'Default',
    apiBase: 'https://inventory-management-production-2079.up.railway.app',
  },
];

export function getDeploymentById(id: string): Deployment | undefined {
  return DEPLOYMENTS.find((d) => d.id === id);
}
