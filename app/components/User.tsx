
import { useUser } from '@clerk/clerk-react'
import { UserButton, SignInButton } from '@clerk/react-router';
import { UserOutlined } from '@ant-design/icons';
import { Row, Col } from 'antd';


export default function UserComponent() {
    const { isSignedIn, user, isLoaded } = useUser()
  
    if (!isLoaded) {
      return <div>Loading...</div>
    }
  
    if (!isSignedIn) {
      return <div><UserOutlined /> <SignInButton /></div>
    }
  
    return <Row>
        <Col>Hi {user.firstName} </Col>
        <Col className="userProfilePicture" span={2}><UserButton /></Col>
    </Row>
  }