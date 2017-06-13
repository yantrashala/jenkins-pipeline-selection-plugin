import React, { PropTypes } from 'react';
import StepIndicator from './StepIndicator';
import Status from './FlowStepStatus';

/**
 * Visual component that displays a progress indicator along with its children.
 * These components are intended to be stacked vertically.
 * Status / progress indicator displayed on left; children display on the right.
 */
export default function VerticalStep(props) {
    const classNames = `${props.status || ''} ${props.className || ''} ${props.isLastStep ? 'last-step' : ''}`.trim();

    return (
        <div className={`vertical-step-component ${classNames}`}>
            <div className="step-progress">
                <div className="step-stroke-top"></div>
                <StepIndicator status={props.status} percentage={props.percentage} />
                <div className="step-stroke-bottom"></div>
            </div>
            <div className="step-content">
                {props.children}
            </div>
        </div>
    );
}

VerticalStep.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    isLastStep: PropTypes.bool,
    status: PropTypes.oneOf(Status.values()),
    percentage: PropTypes.number,
};

VerticalStep.defaultProps = {
    status: 'incomplete',
    percentage: -1,
};
