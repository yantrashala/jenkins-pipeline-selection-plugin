import React, { PropTypes } from 'react';
import { IconButton } from '@jenkins-cd/design-language';

export default function BitDefaultOption(props) {
    function onSelect() {
        if (props.onSelect) {
            props.onSelect();
        }
    }
    const className = `monochrome ${props.isSelected ? 'active' : ''}`;
    
    return (
        <IconButton className={className} label="BitBucket" onClick={onSelect}>
            
        </IconButton>
    );
}

BitDefaultOption.propTypes = {
    onSelect: PropTypes.func,
    isSelected: PropTypes.bool,
};
