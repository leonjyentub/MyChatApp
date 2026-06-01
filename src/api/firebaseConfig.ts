import { initializeApp } from "firebase/app";
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 使用您提供的 Firebase 專案設定金鑰
const firebaseConfig = {
  apiKey: "AIzaSyAma-2_MtIATF-jKlx1E4yNHfhz3PpmXsA",
  authDomain: "mychatapp-b37e4.firebaseapp.com",
  projectId: "mychatapp-b37e4",
  storageBucket: "mychatapp-b37e4.firebasestorage.app",
  messagingSenderId: "579069137176",
  appId: "1:579069137176:web:ea4d9899476ba839570e6d",
  measurementId: "G-WB9F1LKN7D"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 使用 AsyncStorage 持久化保存登入狀態，解決 Expo App 重啟會登出的問題
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// 初始化 Firestore
export const db = getFirestore(app);
