// Handlebars template rendering for edge functions
// Simple implementation without external dependencies

/**
 * Render a Handlebars template with data
 * Supports basic {{variable}} syntax and {{#each}} loops
 * @param template Template string with Handlebars syntax
 * @param data Data object to render
 * @returns Rendered string
 */
export function renderTemplate(template: string, data: any): string {
  let result = template;

  // Helper function to convert data to JSON string
  const jsonHelper = (value: any): string => {
    return JSON.stringify(value, null, 2);
  };

  // Replace {{json variable}} helpers
  result = result.replace(/\{\{json\s+(\w+)\}\}/g, (_match, key) => {
    const value = data[key];
    return value !== undefined ? jsonHelper(value) : '';
  });

  // Replace {{#each array}} blocks
  result = result.replace(
    /\{\{#each\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_match, path, block) => {
      const value = getNestedValue(data, path);
      if (!Array.isArray(value)) return '';

      return value.map((item) => {
        let itemBlock = block;
        // Replace {{this}} with item value
        itemBlock = itemBlock.replace(/\{\{this\}\}/g, String(item));
        // Replace {{this.property}} with item properties
        itemBlock = itemBlock.replace(/\{\{this\.(\w+)\}\}/g, (_m, prop) => {
          return item[prop] !== undefined ? String(item[prop]) : '';
        });
        // Replace {{@key}} with current key (for object iteration)
        itemBlock = itemBlock.replace(/\{\{@key\}\}/g, String(item));
        return itemBlock;
      }).join('');
    }
  );

  // Replace {{#if condition}} blocks
  result = result.replace(
    /\{\{#if\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
    (_match, path, truthyBlock, falsyBlock = '') => {
      const value = getNestedValue(data, path);
      return value ? truthyBlock : falsyBlock;
    }
  );

  // Replace simple {{variable}} patterns
  result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path) => {
    const value = getNestedValue(data, path);
    return value !== undefined && value !== null ? String(value) : '';
  });

  return result;
}

/**
 * Get nested property value from object using dot notation
 * @param obj Object to traverse
 * @param path Dot-separated path (e.g., 'user.name')
 * @returns Value at path or undefined
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * Register custom Handlebars helper (for compatibility)
 * Note: This is a no-op in this simple implementation
 * Custom helpers are built into renderTemplate
 */
export function registerHelper(_name: string, _fn: Function): void {
  // No-op: helpers are built into renderTemplate
}
