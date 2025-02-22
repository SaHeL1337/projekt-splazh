import React, { useState, useEffect } from 'react';

function Post() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/posts/3')
      .then(response => response.json())
      .then(json => setData(json))
      .catch(error => console.error(error));
  }, []);

  return (
    <div>
      {data ? <pre>{JSON.stringify(data, null, 2)}</pre> : 'Loading...'}
    </div>
  );
}

export default Post;