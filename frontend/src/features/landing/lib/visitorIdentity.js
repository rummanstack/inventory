const VISITOR_TOKEN_KEY = 'stockledger.visitorChatToken';

export function getVisitorToken() {
  return localStorage.getItem(VISITOR_TOKEN_KEY) || '';
}

export function setVisitorToken(token) {
  if (token) {
    localStorage.setItem(VISITOR_TOKEN_KEY, token);
  }
}
