import React from 'react';
import ScmProvider from './ScmProvider';
import BitDefaultOption from './bitDefaultOption';
import GitFlowManager from './git/GitFlowManager';
import GitCreationApi from './git/GitCreationApi';
import { CredentialsApi } from './credentials/CredentialsApi';

export default class BitBucketScmProvider extends ScmProvider {

    manager = null;

    getDefaultOption() {
        return <BitDefaultOption />;
    }

    getFlowManager() {
         const createApi = new GitCreationApi();
         const credentialsApi = new CredentialsApi();
         return new GitFlowManager(createApi, credentialsApi);
    }

    destroyFlowManager() {
        if (this.manager) {
            this.manager.destroy();
            this.manager = null;
        }
    }
}
