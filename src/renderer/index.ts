import { createElement } from 'react';
import { render } from 'react-dom';
import App from './components/App/App';

const rootEl = document.getElementById('root');

render(createElement(App), rootEl);
