
function FetchWithAuth(url: string | URL | Request, token:unknown, options: RequestInit | undefined) {
    //write a function that fetches data from the url and appends authentication bearer token before to the headers
    //return the response
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

  //export function
  export { FetchWithAuth };