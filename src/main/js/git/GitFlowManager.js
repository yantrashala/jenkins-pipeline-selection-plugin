import React from 'react';
import { action, computed, observable, extras } from 'mobx';
import { Promise } from 'es6-promise';
require('es6-promise').polyfill();
require('isomorphic-fetch');
import { i18nTranslator, logging, Fetch } from '@jenkins-cd/blueocean-core-js';
const translate = i18nTranslator('blueocean-dashboard');
import FlowManager from '../flow2/FlowManager';
import waitAtLeast from '../flow2/waitAtLeast';
import { CreatePipelineOutcome } from './GitCreationApi';
import { CredentialsManager } from '../credentials/CredentialsManager';
import { UnknownErrorStep } from './steps/UnknownErrorStep';
import { LoadingStep } from './steps/LoadingStep';
import GitConnectStep from './GitConnectStep';
import GitCompletedStep from './GitCompletedStep';
import GitRenameStep from './steps/GitRenameStep';
import AddJenkinsFile from './steps/AddJenkinsFile';
import STATE from './GitCreationState';


const LOGGER = logging.logger('io.jenkins.blueocean.git-pipeline');
const MIN_DELAY = 500;
const SAVE_DELAY = 1000;


/**
 * Impl of FlowManager for git creation flow.
 */
export default class GitFlowManager extends FlowManager {

    credentialsManager = null;

    @observable
    noCredentialsOption = null;

    @computed
    get credentials() {
        const credentials = this.credentialsManager.credentials.slice();
        return [].concat(this.noCredentialsOption, credentials);
    }

    @observable
    outcome = null;

    pipelineName = null;

    selectedCredential = null;

    pipeline = null;

    constructor(createApi, credentialsApi) {
        super();

        this._createApi = createApi;
        this.credentialsManager = new CredentialsManager(credentialsApi);
        this._initalize();
    }

    @action
    _initalize() {
        this.noCredentialsOption = {
            displayName: translate('creation.git.step1.credentials_placeholder'),
        };
    }

    translate(key, opts) {
        return translate(key, opts);
    }

    getStates() {
        return STATE.values();
    }

    getInitialStep() {
        return {
            stateId: STATE.LOADING_CREDENTIALS,
            stepElement: <LoadingStep />,
        };
    }

    onInitialized() {
        this.listAllCredentials();
    }

    listAllCredentials() {
        return this.credentialsManager.listAllCredentials()
            .then(waitAtLeast(MIN_DELAY))
            .then(() => this._showConnectStep());
    }

    checkPipelineNameAvailable(name) {
        if (!name) {
            return new Promise(resolve => resolve(false));
        }

        return this._createApi.checkPipelineNameAvailable(name);
    }

    createPipeline(repositoryUrl, credential) {
        this.repositoryUrl = repositoryUrl;
        this.selectedCredential = credential;
        this.pipelineName = this._createNameFromRepoUrl(repositoryUrl);
        return this._initiateCreatePipeline();
    }

    saveRenamedPipeline(pipelineName) {
        this.pipelineName = pipelineName;
        return this._initiateCreatePipeline();
    }

    _showPlaceholder() {
        this.setPlaceholders([
            this.translate('creation.git.step3.title_completed'),
        ]);
    }

    addJenkinsFile(type) {
        LOGGER.warn('Trying to create jenkins file with '+type);
        this.setPlaceholders([
            'Adding Jenkins To Your Repo...'
        ]);
        var self = this;
        fetch('http://localhost:5000/AddJenkinsFile?repoUrl='+this.repositoryUrl+'&username='+this.selectedCredential.username+'&pass='+this.selectedCredential.password+'&type='+type)
        .then(function(response) {
            return response.json();
        })
        .then(function(res) {
            if(res.status == "success") {
                self.setPlaceholders(['Yay! JenkinsFile was added to your repo under a branch "blue-ocean"']);
                var id = STATE.STEP_CONNECT;
                setTimeout(function(){ 
                    self.renderStep({
                        stateId: STATE.CREATE_PIPELINE,
                        stepElement: <GitCompletedStep />,
                        id,
                    });
                    return self._createApi.createPipeline(self.repositoryUrl, self.credentialsManager.systemSSHCredential.id, self.pipelineName)
                            .then(waitAtLeast(SAVE_DELAY))
                            .then(result => self._createPipelineComplete(result)); 
                }, 3000);           
            } else {
                self.setPlaceholders(['There is an error pushing the file please try again.']);
            }
        })
    }

    _showConnectStep() {
        this.renderStep({
            stateId: STATE.STEP_CONNECT,
            stepElement: <GitConnectStep />,
        });

        this._showPlaceholder();
    }

    _initiateCreatePipeline() {
        const afterStateId = this.isStateAdded(STATE.STEP_RENAME) ?
            STATE.STEP_RENAME : STATE.STEP_CONNECT;

        // this.renderStep({
        //     stateId: STATE.CREATE_PIPELINE,
        //     stepElement: <GitCompletedStep />,
        //     afterStateId,
        // });
        var _self = this;
    fetch('http://localhost:5000/checkJenkinsFile?repoUrl="'+this.repositoryUrl+'"')
    .then(function(response) {
        return response.json();
    })
    .then(function(res) {
        if(res.fileStatus) {
            _self.jenkinsFileAvailable = res.fileStatus;
            _self.renderStep({
            stateId: STATE.CREATE_PIPELINE,
            stepElement: <GitCompletedStep />,
            afterStateId,
        });
        } else {
            _self.renderStep({
                    stateId: STATE.CREATE_PIPELINE,
                    stepElement: <AddJenkinsFile />
            })
        }
    });

        this.jenkinsFileAvailable = _self.jenkinsFileAvailable;

        this.setPlaceholders();

        let credentialId = null;

        if (this.selectedCredential === this.noCredentialsOption) {
            if (!this._isHttpRepositoryUrl(this.repositoryUrl)) {
                if (this.credentialsManager.systemSSHCredential) {
                    LOGGER.debug('using default system SSH key credential for creation');
                    credentialId = this.credentialsManager.systemSSHCredential.id;
                } else {
                    LOGGER.warn('attempting to create from Git repo w/ SSH URL but no default SSH credential exists');
                }
            }
        } else if (this.selectedCredential !== this.noCredentialsOption) {
            credentialId = this.selectedCredential.id;
        }

        LOGGER.debug('creating pipeline with parameters', this.repositoryUrl, credentialId, this.pipelineName);

        if(this.jenkinsFileAvailable) {
            return this._createApi.createPipeline(this.repositoryUrl, credentialId, this.pipelineName)
            .then(waitAtLeast(SAVE_DELAY))
            .then(result => this._createPipelineComplete(result));    
        }

        
    }

    @action
    _createPipelineComplete(result) {
        this.outcome = result.outcome;

        if (result.outcome === CreatePipelineOutcome.SUCCESS) {
            this.changeState(STATE.COMPLETE);
            this.pipeline = result.pipeline;
        } else if (result.outcome === CreatePipelineOutcome.INVALID_NAME) {
            this.renderStep({
                stateId: STATE.STEP_RENAME,
                stepElement: <GitRenameStep pipelineName={this.pipelineName} />,
                afterStateId: STATE.STEP_CONNECT,
            });
            this._showPlaceholder();
        } else if (result.outcome === CreatePipelineOutcome.INVALID_URI || result.outcome === CreatePipelineOutcome.INVALID_CREDENTIAL) {
            this.removeSteps({ afterStateId: STATE.STEP_CONNECT });
            this._showPlaceholder();
        } else if (result.outcome === CreatePipelineOutcome.ERROR) {
            this.renderStep({
                stateId: STATE.ERROR,
                stepElement: <UnknownErrorStep error={result.error} />,
                afterStateId: STATE.STEP_CONNECT,
            });
        }
    }

    _isHttpRepositoryUrl(repositoryUrl) {
        const url = repositoryUrl && repositoryUrl.toLowerCase() || '';
        return url.indexOf('http') === 0 || url.indexOf('https') === 0;
    }

    _createNameFromRepoUrl(repositoryUrl) {
        const lastSlashToken = repositoryUrl ? repositoryUrl.split('/').slice(-1).join('') : '';
        return lastSlashToken.split('.').slice(0, 1).join('');
    }

}
