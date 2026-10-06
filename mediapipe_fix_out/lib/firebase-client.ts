import {initializeApp,getApps} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInAnonymously,signOut,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification} from 'firebase/auth';
const config={apiKey:import.meta.env.VITE_FIREBASE_API_KEY,authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,appId:import.meta.env.VITE_FIREBASE_APP_ID};
export const firebaseReady=Object.values(config).every(Boolean);
function auth(){if(!firebaseReady)throw new Error('Firebase belum dikonfigurasi. Ikuti PANDUAN_NETLIFY.md. Mod contoh boleh digunakan sekarang.');return getAuth(getApps()[0]||initializeApp(config));}
export async function bearer(){if(!firebaseReady)return null;const a=auth();await a.authStateReady();return a.currentUser?await a.currentUser.getIdToken():null;}
export async function studentSignIn(){const a=auth();await a.authStateReady();if(!a.currentUser)await signInAnonymously(a);}
export async function teacherSignIn(){const a=auth();const p=new GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});await signInWithPopup(a,p);window.location.assign('/guru');}
export async function teacherEmailAuth(email:string,password:string,create=false){const a=auth();if(create){const credential=await createUserWithEmailAndPassword(a,email.trim(),password);await sendEmailVerification(credential.user);await signOut(a);return 'verification-sent';}const credential=await signInWithEmailAndPassword(a,email.trim(),password);await credential.user.reload();if(!credential.user.emailVerified){await signOut(a);throw new Error('Sahkan alamat e-mel melalui pautan yang dihantar sebelum log masuk.');}await credential.user.getIdToken(true);window.location.assign('/guru');return 'signed-in';}
export async function logout(){if(firebaseReady)await signOut(auth());window.location.assign('/');}
