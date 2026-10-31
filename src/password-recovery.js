// A fragment never reaches the web server or its access logs. Remove it from
// the current history entry as soon as the app has captured it in memory.
export function takeRecoveryToken(location, history) {
  const prefix='#reset-password=';
  if(!location.hash.startsWith(prefix))return null;
  const token=location.hash.slice(prefix.length);
  history.replaceState(null,'',location.pathname+location.search);
  return token;
}
