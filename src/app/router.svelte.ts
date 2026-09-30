/**
 * Hash routing: "#/magnetometer" opens a tool, anything else is home. Each
 * navigation adds a history entry, so Android's back button returns home.
 */
function currentRoute(): string {
  return location.hash.replace(/^#\/?/, '');
}

export const route = $state({ path: currentRoute() });

window.addEventListener('hashchange', () => {
  route.path = currentRoute();
});

export function navigate(path: string): void {
  location.hash = path ? `/${path}` : '';
}
