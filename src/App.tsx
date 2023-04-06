import { Route, Routes } from 'react-router-dom';
import { Base } from './base';
import { useGlobalContext } from './stores';
import { CreateView, FulfillView, HomeView } from './views';

function App() {
    const { peer } = useGlobalContext();
    return (
        <Base loading={peer.loading}>
            <Routes>
                <Route path="/" element={<HomeView />} />
                <Route path="/create" element={<CreateView />} />
                <Route path="/fulfill" element={<FulfillView />} />
                <Route path="/:address/:multiaddr" element={<FulfillView />} />
            </Routes>
        </Base>
    );
}

export default App;
