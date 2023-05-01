// This example uses this CSS build to minimize CodeSandBox transpile times
import '@carbon/ibm-products/css/index-full-carbon.css';
import './index.scss';

import React from 'react';
import ReactDOM from 'react-dom';
import './config';
import Example from './Example/Example';
import { ThemeProvider } from './ThemeSelector/ThemeContext';
import { ThemeDropdown } from './ThemeSelector/ThemeDropdown';

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider>
      <Example />
      <ThemeDropdown />
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
