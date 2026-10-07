import {initializeApp,getApps} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInAnonymously,signOut,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification} from 'firebase/auth';

// Firebase Web config is public client configuration (not a service-account secret).
// Hardcoded here so Cloudflare Pages does not depend on VITE_* build-time variables.
const config={
  apiKey:'AIzaSyDppYDu5_ifyagVFeLRIedzKGzqY2jY-RE',
  authDomain:'misi-pulau-skuad.firebaseapp.com',
  projectId:'misi-pulau-skuad',
  storageBucket:'misi-pulau-skuad.firebasestorage.app',
  messagingSenderId:'625124715054',
  appId:'1:625124715054:web:1c7bf031fd1a11c3c5cdbf'
};

export const firebaseReady=true;
function auth(){return getAuth(getApps()[0]||initializeApp(config));}
export async function bearer(){const a=auth();await a.authStateReady();return a.currentUser?await a.currentUser.getIdToken(true):null;}
export async function studentSignIn(){const a=auth();await a.authStateReady();if(!a.currentUser)await signInAnonymously(a);await a.currentUser?.getIdToken(true);}
export async function teacherSignIn(){const a=auth();const p=new GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});await signInWithPopup(a,p);await a.currentUser?.getIdToken(true);window.location.assign('/guru');}
export async function teacherEmailAuth(email:string,password:string,create=false){const a=auth();if(create){const credential=await createUserWithEmailAndPassword(a,email.trim(),password);await sendEmailVerification(credential.user);await signOut(a);return 'verification-sent';}const credential=await signInWithEmailAndPassword(a,email.trim(),password);await credential.user.reload();if(!credential.user.emailVerified){await signOut(a);throw new Error('Sahkan alamat e-mel melalui pautan yang dihantar sebelum log masuk.');}await credential.user.getIdToken(true);window.location.assign('/guru');return 'signed-in';}
export async function logout(){await signOut(auth());window.location.assign('/');}
