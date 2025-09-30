// Simple template renderer for Handlebars-style templates
// Supports basic variable substitution and simple loops

interface TemplateData {
  [key: string]: any;
}

export function renderTemplate(template: string, data: TemplateData): string {
  let result = template;
  
  // Handle {{json variable}} - renders as JSON string
  result = result.replace(/\{\{json\s+([^}]+)\}\}/g, (match, variable) => {
    const value = getNestedValue(data, variable.trim());
    return JSON.stringify(value);
  });
  
  // Handle {{#each array}} loops
  result = result.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayPath, content) => {
    const array = getNestedValue(data, arrayPath.trim());
    if (!Array.isArray(array)) return '';
    
    return array.map(item => {
      let itemContent = content;
      
      // Handle {{this}} for primitive arrays
      itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
      
      // Handle {{this.property}} for object arrays
      if (typeof item === 'object' && item !== null) {
        itemContent = itemContent.replace(/\{\{this\.([^}]+)\}\}/g, (propMatch, propName) => {
          return String(item[propName] || '');
        });
      }
      
      return itemContent;
    }).join('');
  });
  
  // Handle simple {{variable}} substitutions
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
    const value = getNestedValue(data, variable.trim());
    return String(value || '');
  });
  
  return result;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : '';
  }, obj);
}