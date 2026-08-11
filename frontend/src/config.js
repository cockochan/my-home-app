const rawApiUrl = process.env.REACT_APP_API_URL || '';
const apiBaseUrl = rawApiUrl.replace(/\/$/, '');

export const apiUrl = (path) => {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
};

export default {
  apiUrl,
};
