var Bootstrap           = require('react-bootstrap')
var EventEmitter        = require('events').EventEmitter
var Griddle             = require('griddle-react')
var React               = require('react')
var assign              = require('object-assign')

var AppDispatcher       = require('../../dispatcher/AppDispatcher')
var DataStore           = require('../../store/DataStore')
var FormElementMixin    = require('../FormElementMixin')
var FormItemStore       = require('../../store/FormItemStore')

var Button              = Bootstrap.Button
var Input               = Bootstrap.Input
var Panel               = Bootstrap.Panel
var Table               = Bootstrap.Table

function validateEmail(email) {
    let re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i
    return re.test(email)
}

const ContactTypeStore = assign({}, FormItemStore)

AppDispatcher.register(payload => {
    if ('contact-form-type-assign' === payload.actionType) {
        ContactTypeStore.setValue(payload.value)
    } else if ('contact-form-reset' === payload.actionType) {
        ContactTypeStore.reset()
    } else if ('contact-form-refresh' === payload.actionType) {
        ContactTypeStore.refresh()
    }
})

const ContactTypeInput = React.createClass({
    mixins: [FormElementMixin],
    store: ContactTypeStore,
    getInitialState: function() {
        return {
            value           : '',
            validationState : null,
            hint            : null
        }
    },
    update: function(value) {
        AppDispatcher.dispatch({
            actionType : 'contact-form-type-assign',
            value      : value
        })
    },
    render: function() {
        return (
            <Input 
              type='select'
              label='Contact type'
              value={this.state.value}
              ref='input'
              onChange={this.handleChange}>
                <option 
                  key='address'
                  value='Address'>
                  Address
                </option>
                <option 
                  key='phone'
                  value='Phone number'>
                  Phone number
                </option>
                <option 
                  key='email'
                  value='Email address'>
                  Email address
                </option>
                <option 
                  key='other'
                  value='Other'>
                  Other
                </option>
            </Input>
        )
    }
})

const ContactInfoStore = assign({}, FormItemStore, {
    validate: function() {
        if (this.value.length) { 
            this.state = 'success'
            this.hint  = null
            switch (ContactTypeStore.getValue()) {
               case 'Phone number':
                    if (!/^\+?[0-9\.\-\s]+$/.test(this.value)) {
                        this.state = 'error'
                        this.hint  = 'Not a valid phone number.'
                    }
                    break
                case 'Email address':
                    if (!validateEmail(this.value)) {
                        this.state = 'warning'
                        this.hint  = 'Not a valid email address.'
                    }
                    break
                case 'Address':
                default:
                    break
            }
        } else {
            this.state = 'error'
            this.hint  = 'This value is required.'
        }
    }
})

AppDispatcher.register(payload => {
    if ('contact-form-info-assign' === payload.actionType) {
        ContactInfoStore.setValue(payload.value)
    } else if ('contact-form-reset' === payload.actionType) {
        ContactInfoStore.reset()
    } else if ('contact-form-refresh' === payload.actionType) {
        ContactInfoStore.refresh()
    }
})

const ContactInfoInput = React.createClass({
    mixins: [FormElementMixin],
    store: ContactInfoStore,
    getInitialState: function() {
        return {
            value           : '',
            validationState : null,
            hint            : null
        }
    },
    update: function(value) {
        AppDispatcher.dispatch({
            actionType : 'contact-form-info-assign',
            value      : value
        })
    },
    onContactTypeChange: function() {
        if (ContactInfoStore.getValue()) {
            ContactInfoStore.refresh()
        } else {
            ContactInfoStore.reset()
        }
    },
    componentDidMount: function() {
        ContactTypeStore.on('change', this.onContactTypeChange)
    },
    componentWillUnmount: function() {
        ContactTypeStore.removeListener('change', this.onContactTypeChange)
    },
    render: function() {
        let addon = null,
            placeholder = ''
        switch (ContactTypeStore.getValue()) {
            case 'Address':
                addon = (<i className='fa fa-home fa-fw'></i>)
                placeholder = 'A street or postal address'
                break
            case 'Phone number':
                addon = (<i className='fa fa-phone fa-fw'></i>)
                placeholder = 'A phone number'
                break
            case 'Email address':
                addon = (<i className='fa fa-envelope-o fa-fw'></i>)
                placeholder = 'A valid email address'
                break
            default:
                placeholder = 'Other information associated with the customer'
                break
        }
        return (
            <Input 
              addonBefore={addon}
              type='text'
              value={this.state.value}
              help={this.state.hint}
              bsStyle={this.state.validationState}
              hasFeedback
              placeholder={placeholder}
              label='Contact details'
              ref='input' 
              onChange={this.handleChange} />
        )
    }
})

const ContactMetaStore = assign({}, FormItemStore)

AppDispatcher.register(payload => {
    if ('contact-form-meta-assign' === payload.actionType) {
        ContactMetaStore.setValue(payload.value)
    } else if ('contact-form-reset' === payload.actionType) {
        ContactMetaStore.reset()
    } else if ('contact-form-refresh' === payload.actionType) {
        ContactMetaStore.refresh()
    }
})

const ContactMetaInput = React.createClass({
    mixins: [FormElementMixin],
    store: ContactMetaStore,
    getInitialState: function() {
        return {
            value           : '',
            validationState : null,
            hint            : null
        }
    },
    update: function(value) {
        AppDispatcher.dispatch({
            actionType : 'contact-form-meta-assign',
            value      : value
        })
    },
    render: function() {
        return (
            <Input 
              type='text'
              value={this.state.value}
              help={this.state.hint}
              hasFeedback
              placeholder='An optional comment or description of this contact detail'
              label='Comment'
              ref='input' 
              onChange={this.handleChange} />
        )
    }
})

const CustomerContactForm = React.createClass({
    componentDidMount: function() {
        AppDispatcher.dispatch({
            actionType : 'contact-form-type-assign',
            value      : 'Address'
        })
    },
    handleSubmit: function() {
        let isValid = !!ContactInfoStore.isValid()
        if (!isValid) {
            AppDispatcher.dispatch({
                actionType: 'contact-form-refresh'
            })
        } else {
            let contact = {
                'type'        : ContactTypeStore.getValue(),
                'info'        : ContactInfoStore.getValue(),
                'meta'        : ContactMetaStore.getValue(),
                '_links'      : {
                    'customer'    : { href: this.props.customer.id },
                    '_collection' : { href: this.props.customer.id }
                }
            }
            let activity = {
                'type'     : 'contact-add',
                'activity' : this.props.activityType,
                'created'  : Date.now(),
                '_links'   : {
                    '_collection' : { href: this.props.customer.id }
                }
            }
            AppDispatcher.dispatch({
                actionType : 'customer-activity',
                command    : {
                    method     : 'POST',
                    resource   : 'contacts', 
                    payload    : contact 
                },
                activity   : activity
            })
            this.resetForm()
            this.props.close()
        }
    },
    resetForm: function() {
        AppDispatcher.dispatch({
            actionType: 'contact-form-reset'
        })
    },
    render: function() {
        return (
            <div>
                <ContactTypeInput ref='contactTypeInput' />
                <ContactInfoInput ref='contactInfoInput' />
                <ContactMetaInput ref='contactMetaInput' />
                <hr />
                <Bootstrap.ButtonGroup>
                    <Button
                      bsStyle='primary'
                      onClick={this.handleSubmit}>
                        <Bootstrap.Glyphicon 
                          glyph='ok' />
                        Save
                    </Button>
                    <Button
                      bsStyle='default'
                      onClick={this.props.close}>
                        Cancel
                    </Button>
                </Bootstrap.ButtonGroup>
            </div>
        )
    }
})

module.exports = CustomerContactForm
