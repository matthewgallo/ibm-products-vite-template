import React from 'react';
import {
  Header,
  HeaderContainer,
  HeaderName,
} from '@carbon/react';

const storyBlockClass = `c4p--notifications-panel__story`;

export const UIShellHeader = () => (
  <HeaderContainer
    render={() => (
      <Header
        aria-label="IBM Cloud Pak"
        className={`${storyBlockClass}--header`}
      >
        <HeaderName href="/" prefix="IBM">
          Products
        </HeaderName>
      </Header>
    )}
  />
);