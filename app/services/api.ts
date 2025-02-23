
function FetchWithAuth(url: string | URL | Request, token: string | null, options: RequestInit | undefined) {
    console.log(token)
    if (options === undefined) {
        options = {};
    }
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`
        }}).then(response => response.json());
  }

  export { FetchWithAuth };