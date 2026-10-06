import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './app/skuad-app';
import './app/globals.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App initialView={location.pathname==='/guru'?'teacher':'home'}/></React.StrictMode>);
