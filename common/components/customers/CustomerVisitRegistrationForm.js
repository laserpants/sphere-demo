import Bootstrap           from 'react-bootstrap'
import DateTimeField       from 'react-bootstrap-datetimepicker'
import React               from 'react'

import AppDispatcher       from '../../dispatcher/AppDispatcher'

import {Button} from 'react-bootstrap'

const CustomerVisitRegistrationForm = React.createClass({
    handleSubmit: function() {
        let customer = this.props.customer,
            dueDate = new Date(this.refs.dateTimeInput.state.inputValue)
        let task = {
            'description' : 'Follow up visit to \'' + customer.name + '\'.',
            'created'     : Date.now(),
            'due'         : dueDate.valueOf(),
            '_links'      : {
                '_collection' : { href: customer.id }
            }
        }
        AppDispatcher.dispatch({
            actionType : 'customer-activity',
            command    : {
                method     : 'POST',
                resource   : 'tasks', 
                payload    : task
            },
            activity   : {
                'type'     : 'followup-visit-register',
                'activity' : this.props.activityType,
                'created'  : Date.now(),
                '_links'   : {
                    '_collection' : { href: customer.id }
                }
            }
        })
        this.props.close()
    },
    render: function() {
        return (
            <div>
                <div className='form-group'>
                    <label>Follow-up visit time</label>
                    <DateTimeField 
                      ref      = 'dateTimeInput'
                      dateTime = {String(Date.now())} />
                </div>
                <hr />
                <Bootstrap.ButtonGroup>
                    <Button
                      bsStyle = 'primary'
                      onClick = {this.handleSubmit}>
                        <Bootstrap.Glyphicon 
                          glyph='ok' />
                        Save
                    </Button>
                    <Button
                      bsStyle = 'default'
                      onClick = {this.props.close}>
                        Cancel
                    </Button>
                </Bootstrap.ButtonGroup>
            </div>
        )
    }
})
 
module.exports = CustomerVisitRegistrationForm
