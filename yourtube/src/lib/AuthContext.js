import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark"); // default dark

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };
  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };
  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        mobile: "9876543210", // placeholder, in real app, collect from user
      };
      const response = await axiosInstance.post("/user/login", payload);
      setTheme(response.data.theme);
      // Now, need to verify OTP
      // For now, assume verified, but in real, prompt for OTP
      const verifyResponse = await axiosInstance.post("/user/verify-otp", {
        email: firebaseuser.email,
        otp: "123456", // placeholder
      });
      login(verifyResponse.data.result);
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
            mobile: "9876543210",
          };
          const response = await axiosInstance.post("/user/login", payload);
          setTheme(response.data.theme);
          // Assume OTP verified
          const verifyResponse = await axiosInstance.post("/user/verify-otp", {
            email: firebaseuser.email,
            otp: "123456",
          });
          login(verifyResponse.data.result);
        } catch (error) {
          console.error(error);
          logout();
        }
      }
    });
    return () => unsubcribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, theme, login, logout, handlegooglesignin }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
