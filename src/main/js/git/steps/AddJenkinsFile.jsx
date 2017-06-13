import React, { PropTypes } from 'react';
import { observer } from 'mobx-react';
import { extras } from 'mobx';
import FlowStep from '../../flow2/FlowStep';
import { Dropdown, FormElement, TextInput } from '@jenkins-cd/design-language';

let t = null, fm = null;
/**
 * Shows the current progress after creation was initiated.
 */
@observer
export default class AddJenkinsFile extends React.Component {

    constructor(props) {
        super(props);
        fm = this.props.flowManager;
        t = this.props.flowManager.translate;
    }

    __jenkinsFileSelect(type) {
        this.props.flowManager.addJenkinsFile(type);
    }

    render() {

        const fileSelect = this.props.flowManager.addJenkinsFile.bind(fm);

        return (
            <FlowStep {...this.props} className="git-step-connect" title='Add a Jenkins File To Your Repo'>
                <p className="instructions">
                    Please select the type of project your are working on.
                </p>
                <FormElement title='Select Project Type'>
                <button
                      className="btn-secondary"
                      onClick={() => fileSelect('nodejs')}
                    >
                        NodeJs
                    </button>
                <button
                  className="btn-secondary"
                  onClick={() => fileSelect('java')}
                >
                    Java
                </button>
                <button
                      className="btn-secondary"
                      onClick={() => fileSelect('.net')}
                    >
                    .Net
                </button>
                </FormElement>
            </FlowStep>
        );
    }
}

AddJenkinsFile.propTypes = {
    flowManager: PropTypes.object,
};
