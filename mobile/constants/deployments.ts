/**
 * Available deployments. Each deployment is a separate backend instance.
 * Add new customers/sites here as they onboard.
 */
export type Deployment = {
  id: string;
  name: string;
  apiBase: string;
  logoUrl?: string; // URL to logo (e.g. {apiBase}/logo.png)
};

export const DEPLOYMENTS: Deployment[] = [
  {
    id: 'atproperties',
    name: '@properties',
    apiBase: 'https://inventory-management-production-2079.up.railway.app',
    logoUrl: 'https://inventory-management-production-2079.up.railway.app/logo.png',
  },
  // Add more deployments here as other customers onboard:
  // { id: 'acme', name: 'Acme Corp', apiBase: 'https://acme-inventory.railway.app', logoUrl: '...' },
];

export function getDeploymentById(id: string): Deployment | undefined {
  return DEPLOYMENTS.find((d) => d.id === id);
}
