import { Route, Routes } from 'react-router-dom';
import { Base } from './base';
import { useGlobalContext } from './stores';
import {
    ActiveOrderbookView,
    CreateView,
    FulfillView,
    HomeView,
    PeerOrderbookView,
    ProfileView,
    BroadcastView,
} from './views';
import { setFallbackWETH } from '@pintswap/sdk';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

setFallbackWETH('0x7a2088a1bFc9d81c55368AE168C2C02570cB814F');

function App() {
    const { pintswap } = useGlobalContext();
    return (
        <>
            <Base loading={pintswap.loading}>
                <Routes>
                    <Route path="/" element={<HomeView />} />
                    <Route path="/create" element={<CreateView />} />
                    <Route path="/fulfill" element={<FulfillView />} />
                    <Route path="/:address/:multiaddr" element={<FulfillView />} />
                    <Route path="/:address" element={<PeerOrderbookView />} />
                    <Route path="/profile" element={<ProfileView />} />
                    <Route path="/broadcast" element={<BroadcastView />} />
                    <Route path="/open" element={<ActiveOrderbookView />} />
                </Routes>
            </Base>

            <ToastContainer
                position="bottom-right"
                autoClose={6000}
                hideProgressBar={false}
                newestOnTop={false}
                rtl={false}
                draggable
                pauseOnHover
                theme="dark"
                toastClassName="!bg-neutral-900"
            />
        </>
    );
}

export default App;
