export const MAIL_SAMPLE={name:'Alex Beispiel',email:'alex@example.test',password:'••••••••••••',login_url:'https://academy.example/',groups:'Webentwicklung',role:'Lernender',app_name:'Entrosphere Developer'};
export function mailPreview(text,variables=MAIL_SAMPLE){return text.replace(/\{([^{}]+)\}/g,(match,key)=>Object.hasOwn(variables,key)?String(variables[key]):match);}
