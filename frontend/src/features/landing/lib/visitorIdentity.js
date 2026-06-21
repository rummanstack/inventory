const VISITOR_TOKEN_KEY = 'stockledger.visitorChatToken';

export function getVisitorToken() {
  return localStorage.getItem(VISITOR_TOKEN_KEY) || '';
}

export function getOrCreateVisitorToken() {
  let token = localStorage.getItem(VISITOR_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(VISITOR_TOKEN_KEY, token);
  }
  return token;
}
