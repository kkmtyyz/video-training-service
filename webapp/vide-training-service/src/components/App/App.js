import { HashRouter, Routes, Route } from "react-router-dom";
import Header from "../Header/Header";
import Home from "../Home/Home";
import Training from "../Training/Training";
import Creating from "../Creating/Creating";

const App = () => {
  return (
    <div>
      <HashRouter basename="/">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/index.html" element={<Home />} />
          <Route path="/training" element={<Training />} />
          <Route path="/creating" element={<Creating />} />
        </Routes>
      </HashRouter>
    </div>
  );
};

export default App;
