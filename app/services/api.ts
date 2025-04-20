function FetchWithAuth(url: string | URL | Request, token: string | null, options: RequestInit | undefined) {
    console.log(token)
    if (options === undefined) {
        options = {};
    }
    if (window.location.href.includes("http://localhost:5173")) {
        url = "http://localhost:3333" + url;
    }

    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .catch(error => {
        console.error("Error in fetch:", error);
        throw error;
    });
}

export { FetchWithAuth };