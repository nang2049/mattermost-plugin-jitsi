// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as React from 'react';
import {createRoot, Root} from 'react-dom/client';
import {Provider} from 'react-redux';

import Conference from './conference/';
import I18nProvider from './i18n_provider/';

export class InjectionProvider extends React.Component<any> {
    public render(): React.ReactElement {
        const stores = {...this.props};
        delete stores.children;
        return React.createElement(Provider as any, stores, this.props.children);
    }
}

export default class RootPortal {
    el: HTMLElement;
    store: any;
    root: Root | null = null;

    constructor(registry: any, store: any) {
        this.el = document.createElement('div');
        this.store = store;
        const rootPortal = document.getElementById('root-portal');
        if (rootPortal) {
            rootPortal.appendChild(this.el);
        } else {
            registry.registerRootComponent(Conference);
        }
    }

    cleanup() {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
        this.el.remove();
    }

    render() {
        const rootPortal = document.getElementById('root-portal');
        if (rootPortal) {
            if (!this.root) {
                this.root = createRoot(this.el);
            }
            this.root.render(
                <InjectionProvider store={this.store}>
                    <I18nProvider>
                        <Conference/>
                    </I18nProvider>
                </InjectionProvider>
            );
        }
    }
}
