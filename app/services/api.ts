
function FetchWithAuth(url: string | URL | Request, token: string | null, options: RequestInit | undefined) {
    console.log(token)
    if (options === undefined) {
        options = {};
    }
    if (window.location.href === "http://localhost:5173/") {
        url = "http://localhost:3333" + url;
    }

    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`
        }}).then(response => response.json());
  }

  export { FetchWithAuth };