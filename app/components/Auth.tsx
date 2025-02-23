
import { useAuth } from '@clerk/clerk-react';
export default function Example() {
    const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth()
  
    if (!isLoaded) {
      return <div>Loading...</div>
    }
  
    if (!isSignedIn) {
      // You could also add a redirect to the sign-in page here
      return <div>No token</div>
    }
  
    return (
      <div>
        abc
      </div>
    )
  }