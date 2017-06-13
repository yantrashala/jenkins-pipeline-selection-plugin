import React, { PropTypes } from 'react';
import { observer } from 'mobx-react';
import debounce from 'lodash.debounce';

import { Dropdown, FormElement, TextInput, PasswordInput } from '@jenkins-cd/design-language';

import FlowStep from '../flow2/FlowStep';

import { CreateCredentialDialog } from '../credentials/CreateCredentialDialog';
import { CreatePipelineOutcome } from './GitCreationApi';
import STATE from './GitCreationState';


let t = null;

function validateUrl(url) {
    return !!url && !!url.trim();
}


/**
 * Component that accepts repository URL and credentials to initiate
 * creation of a new pipeline.
 */
@observer
export default class GitConnectStep extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            repositoryUrl: null,
            repositoryErrorMsg: null,
            credentialErrorMsg: null,
            selectedCredential: null,
            showCreateCredentialDialog: false,
            credentialsName: null,
            credentialsPassword: null
        };

        t = this.props.flowManager.translate;
    }

    componentWillMount() {
        const { noCredentialsOption } = this.props.flowManager;
        this._selectedCredentialChange(noCredentialsOption);
    }

    _bindDropdown(dropdown) {
        this.dropdown = dropdown;
    }

    _repositoryUrlChange(value) {
        this.setState({
            repositoryUrl: value,
        });

        this._updateRepositoryErrorMsg();
    }

    _credentialUserName(value) {
        this.setState({
            credentialsName: value,
        });
    }

    _credentialUserPassword(value) {
        this.setState({
            credentialsPassword: value,
        });
    }    

    _getRepositoryErrorMsg(outcome) {
        if (this.state.repositoryErrorMsg) {
            return this.state.repositoryErrorMsg;
        } else if (outcome === CreatePipelineOutcome.INVALID_URI) {
            return t('creation.git.step1.repo_error_invalid');
        }

        return null;
    }

    _updateRepositoryErrorMsg = debounce(() => {
        if (validateUrl(this.state.repositoryUrl)) {
            this.setState({
                repositoryErrorMsg: null,
            });
        }
    }, 200);

    _selectedCredentialChange(credential) {
        this.setState({
            selectedCredential: credential,
        });
    }

    _getCredentialErrorMsg(outcome) {
        if (this.state.credentialErrorMsg) {
            return this.state.credentialErrorMsg;
        } else if (outcome === CreatePipelineOutcome.INVALID_CREDENTIAL) {
            return t('creation.git.step1.credentials_error_invalid');
        }

        return null;
    }

    _onCreateCredentialClick() {
        this.setState({
            showCreateCredentialDialog: true,
        });
    }

    _onCreateCredentialClosed(credential) {
        const newState = {
            showCreateCredentialDialog: false,
        };

        if (credential) {
            newState.selectedCredential = credential;
        }

        this.setState(newState);

        // TODO: control this more cleanly via a future 'selectedOption' prop on Dropdown
        this.dropdown.setState({
            selectedOption: credential,
        });
    }

    _performValidation() {
        if (!validateUrl(this.state.repositoryUrl)) {
            this.setState({
                repositoryErrorMsg: t('creation.git.step1.repo_error_required'),
            });

            return false;
        }

        return true;
    }

    _beginCreation() {
        const isValid = this._performValidation();

        if (!isValid) {
            return;
        }

        this.props.flowManager.createPipeline(this.state.repositoryUrl, {
            username: this.state.credentialsName, password: this.state.credentialsPassword
        });
    }

    render() {
        const { noCredentialsOption } = this.props.flowManager;
        const { flowManager } = this.props;
        const repositoryErrorMsg = this._getRepositoryErrorMsg(flowManager.outcome);
        const credentialErrorMsg = this._getCredentialErrorMsg(flowManager.outcome);

        const disabled = flowManager.stateId !== STATE.STEP_CONNECT && flowManager.stateId !== STATE.COMPLETE;
        const createButtonLabel = !disabled ?
            t('creation.git.step1.create_button') :
            t('creation.git.step1.create_button_progress');

        return (
            <FlowStep {...this.props} className="git-step-connect" title={t('creation.git.step1.title')} disabled={disabled}>
                <p className="instructions">
                    Any repository containing a Jenkinsfile will be built automatically. If the repository doesn't contain a jenkins file please select a jenkins file from our options and we will stitch it for you. &nbsp;
                </p>

                <FormElement title={t('creation.git.step1.repo_title')} errorMessage={repositoryErrorMsg}>
                    <TextInput className="text-repository-url" onChange={val => this._repositoryUrlChange(val)} />
                </FormElement>

                <FormElement title='Enter Credentials'>
                    <TextInput placeholder="Username" onChange={val => this._credentialUserName(val)} />

                    <PasswordInput placeholder="Password" type="password" onChange={val => this._credentialUserPassword(val)} />
                </FormElement>

                <button
                  className="button-create-pipeline"
                  onClick={() => this._beginCreation()}
                >
                    {createButtonLabel}
                </button>

            </FlowStep>
        );
    }
}

GitConnectStep.propTypes = {
    flowManager: PropTypes.object,
};
