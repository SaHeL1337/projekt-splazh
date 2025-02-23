
import { Layout as L} from 'antd';
const { Footer } = L;
export default function MyFooter(){
   return <Footer className="footer" style={{ textAlign: 'center' }}>
          SaHeL1337 ©{new Date().getFullYear()}
        </Footer>
}