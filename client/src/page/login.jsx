import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Grant } from "../assets";
import { LoginComponent } from "../components";
import { setLoading } from "../redux/loading";
import "./style.scss";

const Login = () => {
  const location = useLocation();
  const [auth, setAuth] = useState(false);
  const { user } = useSelector((state) => state);
  const [theme, setTheme] = useState('light');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      if (location?.pathname === "/login/auth") {
        setAuth(true);
        setTimeout(() => {
          dispatch(setLoading(false));
        }, 1000);
      } else {
        setAuth(false);
        setTimeout(() => {
          dispatch(setLoading(false));
        }, 1000);
      }
    }
  }, [location]);

  const toggleTheme = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      setIsTransitioning(false);
    }, 500);
  };

  const backgroundImage = theme === 'light' 
    ? 'url(https://images.unsplash.com/photo-1586145571648-77f9424a97d6?q=80&w=1528&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)'
    : 'url(https://images.unsplash.com/photo-1552570173-1e3d3eaf989c?q=80&w=1530&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)';

  const colourValue = theme === 'light' ? "#FFD" : "#344356";
  const opacityValue = theme === 'light' ? 0.8 : 0.8;
  
  return (
    <div className="Auth">
      <div className="inner">
        {auth ? (
          <LoginComponent themeValue={theme}/>
        ) : (
          <div className="suggection">
            <div 
              className="left-column" 
              style={{ backgroundImage, 
                       backgroundRepeat: 'no-repeat',
                       backgroundPosition: 'center center',
                       backgroundSize: 'cover'
                    }}
            >
              <Grant bgColour={colourValue} bgOpacity={opacityValue}/>
            </div>
            <div className="right-column">
              <div className="bgCurve">  
                <p>Welcome to <h1>GE CoPilot™</h1></p>
                <br /><br />
                <p>Start your new chat now!</p>
                <br /><br /><br />
                <p>Log in or Sign up with your account to continue</p>
                <div className="btns">
                  <button onClick={() => { navigate("/login/auth"); }}>
                    Log in
                  </button>
                  <button onClick={() => { navigate("/signup"); }}>
                    Sign up
                  </button>
                </div>
                <br />
              </div>
              <div className="toggle">
                <p>Not pleasing your eyes?</p>
                <button
                  className={`toggle-button ${isTransitioning ? 'transitioning' : ''}`}
                  onClick={toggleTheme}
                >
                  Toggle to {theme === 'light' ? 'Dark' : 'Light'} Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* redundant code for this page */}
        {/* <div className="bottum">
          
        </div> */}
      </div>
    </div>
  );
};

export default Login;
