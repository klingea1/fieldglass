import { mount } from 'svelte';
import App from './app/App.svelte';
import './ui/global.css';

export default mount(App, { target: document.getElementById('app')! });
