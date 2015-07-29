import Bootstrap           from 'react-bootstrap'
import DateTimeField       from 'react-bootstrap-datetimepicker'
import EventEmitter        from 'events'
import React               from 'react'
import assign              from 'object-assign'

import AppDispatcher       from '../../dispatcher/AppDispatcher'
import DataStore           from '../../store/DataStore'
import FormItemStore       from '../../store/FormItemStore'

import {Button, ButtonGroup, Input, Modal, Panel, Table} from 'react-bootstrap'

const ProductSelectionStore = assign({}, EventEmitter.prototype, {

    _collection    : [],
    _priceCategory : null,
    _total         : 0,

    _computeTotal: function() {
        this._total = 0
        this._collection.forEach(product => {
            let price = product.price
            if (isNaN(price)) {
                this._total = 'Not available'
                return
            } else {
                this._total += price
            }
        })
    },

    setPriceCategory: function(category) {
        this._priceCategory = category
        this.resetCollection()
    },

    resetCollection: function() {
        this._total = 0
        this._collection = []
        this.emit('change')
    },

    removeProduct: function(index) {
        this._collection.splice(index, 1)
        this.reIndex()
        this._computeTotal()
        this.emit('change')
    },

    addProduct: function() {

        let product  = ProductStore.getProduct(),
            quantity = QuantityStore.getValue(),
            newItem  = {
                product  : product,
                quantity : quantity
            }

        let done = false

        this._collection.forEach(item => {
            if (item.product.sku === product.sku) {
                let qty = Number(item.quantity) + Number(quantity)
                item.quantity = qty
                if (!isNaN(item.itemPrice))
                    item.price = item.itemPrice * qty
                done = true
                this._computeTotal()
                this.emit('change')
                return 
            }
        })

        if (done)
            return

        let productPrices = product.getEmbedded('prices')

        if (!this._priceCategory || !productPrices || !productPrices.hasOwnProperty(this._priceCategory)) {
            newItem.itemPrice = 'Not available'
            newItem.price     = '-'
        } else {
            let aPrice = productPrices[this._priceCategory]
            newItem.itemPrice = aPrice
            newItem.price = newItem.quantity * aPrice
        }

        this._collection.push(newItem)
        this.reIndex()
        this._computeTotal()
        this.emit('change')
    },

    setQuantity: function(index, quantity) {
        let item = this._collection[index]
        item.quantity = quantity
        if (!isNaN(item.itemPrice))
            item.price = item.itemPrice * quantity
        this._computeTotal()
        this.emit('change')
    },

    reIndex: function() {
        let i = 0
        this._collection.forEach(item => {
            item._index = i++
        })
    },

    collection: function() {
        return this._collection
    },

    total: function() {
        return this._total
    }

})

AppDispatcher.register(payload => {
    switch (payload.actionType) {
        case 'order-product-add-item':
            ProductSelectionStore.addProduct()
            break
        case 'order-product-remove-item':
            ProductSelectionStore.removeProduct(payload.index)
            break
        case 'order-product-update-quantity':
            ProductSelectionStore.setQuantity(payload.index, payload.quantity)
            break
         case 'order-assign-price-category':
            ProductSelectionStore.setPriceCategory(payload.category)
            break
        default:
            break
    }
})

const ProductStore = assign({}, FormItemStore, {

    _products    : [],
    _suggestions : [],
    _product     : null,

    validate: function() {
        if (this.value.length <= 2) {
            this.state = 'error'
            this.hint  = 'This field is required.'
        } else {
            let found = null
            this._suggestions = []
            this._products.forEach(product => {
                if (product.name == this.value || product.sku == this.value) {
                    found = product
                    return
                }
                let name  = product.name.toLowerCase(),
                    sku   = product.sku.toLowerCase(),
                    value = this.value.toLowerCase()
                if (-1 !== name.indexOf(value) || -1 !== sku.indexOf(value)) 
                    this._suggestions.push(product)
            })
            if (!found) {
                this.state = this._suggestions.length ? 'warning' : 'error'
            } else {
                this._suggestions = []
                this.state = 'success'
                this._product = found
            }
            this.hint = null
        }
    },

    getSuggestions: function() {
        return this._suggestions
    },

    getProduct: function() {
        return this._product
    }

})

AppDispatcher.register(payload => {
    if ('order-form-product-assign' === payload.actionType) {
        ProductStore.setValue(payload.product)
    } else if ('order-form-init' === payload.actionType) {
        ProductStore._products = DataStore.fetchCollection('products')
        ProductStore._suggestions = []
        ProductSelectionStore.setPriceCategory(payload.customer.priceCategory)
    } else if ('order-form-reset' === payload.actionType) {
        ProductStore.reset()
    } else if ('order-form-refresh' === payload.actionType) {
        ProductStore.refresh()
    }
})

const ProductInput = React.createClass({
    getInitialState: function() {
        return {
            value           : '',
            validationState : null,
            hint            : null,
            suggestions     : []
        }
    },
    updateValue: function() {
        this.setState(ProductStore.getState())
    },
    componentDidMount: function() {
        ProductStore.on('change', this.updateValue)
    },
    componentWillUnmount: function() {
        ProductStore.removeListener('change', this.updateValue)
    },
    handleChange: function(event) {
        this._update(event.target.value)
    },
    reset: function() {
        this._update('')
    },
    _update: function(value) {
        AppDispatcher.dispatch({
            actionType : 'order-form-product-assign',
            product    : value
        })
    },
    renderSuggestions: function() {
        let suggestions = ProductStore.getSuggestions()
        if (!suggestions || !suggestions.length)
            return (
                <span />
            )
        let i = 0
        return (
            <Table 
              bordered  
              condensed 
              hover 
              className='type-ahead' 
              style={{marginTop: '-16px', border: '2px solid #dce4ec'}}>
                <tbody>
                    {suggestions.map(item => {
                        return (
                            <tr
                              key={i++} 
                              onClick={() => this._update(item.name)}>
                              <td>{item.name}</td>
                              <td>{item.sku}</td>
                            </tr> 
                        )
                    })}
                </tbody>
            </Table>
        )
    },
    render: function() {
        return (
            <div>
                <Input 
                  type='text'
                  label={this.props.label}
                  value={this.state.value}
                  help={this.state.hint}
                  placeholder='Enter the name or SKU of a product'
                  bsStyle={this.state.validationState}
                  hasFeedback
                  ref='input'
                  onChange={this.handleChange} />
                {this.renderSuggestions()}
            </div>
        )
    }
})

const ItemQuantityStore = assign({}, FormItemStore, {
    validate: function() {
        let result = validateQuantity(this.value)
        this.state = result.state
        this.hint  = result.hint
    }
})

AppDispatcher.register(payload => {
    if ('order-form-quantity-assign' === payload.actionType) {
        ItemQuantityStore.setValue(payload.quantity)
    } else if ('order-form-reset' === payload.actionType) {
        ItemQuantityStore.reset()
    } else if ('order-form-refresh' === payload.actionType) {
        ItemQuantityStore.refresh()
    }
})

const ItemQuantityComponent = React.createClass({
    getInitialState: function() {
        return {
            editMode        : false,
            value           : this.props.item.quantity,
            validationState : null,
            hint            : null
        }
    },
    updateValue: function() {
        this.setState(ItemQuantityStore.getState())
    },
    componentDidMount: function() {
        ItemQuantityStore.on('change', this.updateValue)
    },
    componentWillUnmount: function() {
        ItemQuantityStore.removeListener('change', this.updateValue)
    },
    handleChange: function(event) {
        this._update(event.target.value)
    },
    reset: function() {
        this._update('')
    },
    _update: function(value) {
        AppDispatcher.dispatch({
            actionType : 'order-form-quantity-assign',
            quantity   : value
        })
    },
    edit: function() {
        this.setState({
            editMode        : true,
            value           : this.props.item.quantity,
            validationState : null,
            hint            : null
        })
    },
    blur: function() {
        this.setState({editMode: false})
        if (ItemQuantityStore.isValid()) {

            AppDispatcher.dispatch({
                actionType : 'order-product-update-quantity',
                quantity   : ItemQuantityStore.getValue(),
                index      : this.props.item._index
            })

        }
    },
    focusInput: function(component) {
        if (component) {
            component.refs.input.getDOMNode().focus()
        }
    },
    render: function() {
        return (
            <span className='inline-table-form'>
                {this.state.editMode ? (
                    <Input
                      type='text'
                      ref={this.focusInput}
                      style={{minWidth: '110px'}}
                      bsStyle={this.state.validationState}
                      bsSize='small'
                      hasFeedback
                      onChange={this.handleChange}
                      help={this.state.hint}
                      onBlur={this.blur}
                      value={this.state.value} />
                ) : (
                    <span>
                        {this.props.item.quantity}
                        <a className='pull-right' href='javascript:;' onClick={this.edit}>
                            <Bootstrap.Glyphicon 
                              style={{padding: '.2em'}}
                              glyph='pencil' />
                        </a>
                    </span>
                )}
            </span>
        )
    }
})

const QuantityStore = assign({}, FormItemStore, {
    validate: function() {
        let result = validateQuantity(this.value)
        this.state = result.state
        this.hint  = result.hint
    }
})

AppDispatcher.register(payload => {
    if ('order-form-quantity-assign' === payload.actionType) {
        QuantityStore.setValue(payload.quantity)
    } else if ('order-form-reset' === payload.actionType) {
        QuantityStore.reset()
    } else if ('order-form-refresh' === payload.actionType) {
        QuantityStore.refresh()
    }
})

const QuantityInput = React.createClass({
    getInitialState: function() {
        return {
            value           : '',
            hint            : null,
            validationState : null
        }
    },
    updateValue: function() {
        this.setState(QuantityStore.getState())
    },
    componentDidMount: function() {
        QuantityStore.on('change', this.updateValue)
    },
    componentWillUnmount: function() {
        QuantityStore.removeListener('change', this.updateValue)
    },
    handleChange: function(event) {
        this._update(event.target.value)
    },
    reset: function() {
        this._update('')
    },
    _update: function(value) {
        AppDispatcher.dispatch({
            actionType : 'order-form-quantity-assign',
            quantity   : value
        })
    },
    render: function() {
        return (
            <Input
              label='Quantity'
              ref='input'
              value={this.state.value}
              placeholder='The number of products to add'
              bsStyle={this.state.validationState}
              hasFeedback
              help={this.state.hint}
              onChange={this.handleChange}
              type='text' />
        )
    }
})

const ItemForm = React.createClass({
    getInitialState: function() {
        return {
            expanded : false
        }
    },
    expand: function() {
        if (ProductStore.isValid()) {
            this.setState({expanded: true})
        }
    },
    componentDidMount: function() {
        ProductStore.on('change', this.expand)
    },
    componentWillUnmount: function() {
        ProductStore.removeListener('change', this.expand)
    },
    addItem: function() {
        let isValid = !!( QuantityStore.isValid()
                        & ProductStore.isValid() )
        if (!isValid) {
            AppDispatcher.dispatch({
                actionType : 'order-form-refresh'
            })
        } else {
            AppDispatcher.dispatch({
                actionType : 'order-product-add-item'
            })
            AppDispatcher.dispatch({
                actionType : 'order-form-reset'
            })
            this.setState({expanded: false})
        }
    },
    render: function() {
        return (
            <div>
                <ProductInput 
                  ref='productInput'
                  label={this.props.label} />
                {this.state.expanded ? (
                    <div>
                        <QuantityInput 
                          ref='quantityInput' />
                        <Button 
                          bsStyle='primary' 
                          bsSize='medium' 
                          onClick={this.addItem}
                          block>
                            <Bootstrap.Glyphicon 
                              glyph='plus-sign' />
                            Add product
                        </Button>
                    </div>
                ) : <span />}
            </div>
        )
    }
})

const OrderProductsComponent = React.createClass({
    removeItem: function(index) {
        AppDispatcher.dispatch({
            actionType : 'order-product-remove-item',
            index      : index
        })
    },
    render: function() {
        if (!this.props.products.length)
            return <span />
        let i = 0
        return (
            <div className='form-group'>
                <label>Products</label>
                <Table striped bordered condensed>
                    <col width={250} />
                    <col width={100} />
                    <col width={110} />
                    <col width={100} />
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>SKU</th>
                            <th>Quantity</th>
                            <th>Item price</th>
                            <th>Price</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                    {this.props.products.map(item => {
                        return (
                            <tr key={i++}>
                                <td>{item.product.name}</td>
                                <td>{item.product.sku}</td>
                                <td>
                                    <ItemQuantityComponent 
                                      item={item} />
                                </td>
                                <td>{item.itemPrice}</td>
                                <td>{item.price}</td>
                                <td>
                                    <Button
                                      onClick={() => this.removeItem(item._index)} 
                                      bsSize='xsmall' 
                                      aria-label='Remove'>
                                        <Bootstrap.Glyphicon 
                                          glyph='remove' />
                                        Remove
                                    </Button>
                                </td>
                            </tr>
                        )
                    })}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={4}>
                                Total
                            </td>
                            <td colSpan={2}>
                                <b>{this.props.total}</b>
                            </td>
                        </tr>
                    </tfoot>
                </Table>
            </div>
        )
    }
})

const ProactiveStore = assign({}, FormItemStore)

ProactiveStore.value = false

AppDispatcher.register(payload => {
    if ('order-form-proactive-assign' === payload.actionType) {
        ProactiveStore.setValue(payload.proactive)
    } else if ('order-form-reset' === payload.actionType) {
        ProactiveStore.reset()
    } else if ('order-form-refresh' === payload.actionType) {
        ProactiveStore.refresh()
    }
})

const OrderSubmitButtonGroup = React.createClass({
    getInitialState: function() {
        return {
            proactive : ProactiveStore.getValue()
        }
    },
    updateValue: function() {
        this.setState({
            proactive: ProactiveStore.getValue()
        })
    },
    componentDidMount: function() {
        ProactiveStore.on('change', this.updateValue)
    },
    componentWillUnmount: function() {
        ProactiveStore.removeListener('change', this.updateValue)
    },
    handleChange: function(event) {
        this._update(event.target.value)
    },
    reset: function() {
        this._update(false)
    },
    _update: function(value) {
        AppDispatcher.dispatch({
            actionType : 'order-form-proactive-assign',
            proactive  : value
        })
    },
    render: function() {
        if (!this.props.visible)
            return <span />
        return (
            <div>
                {('Customer call' === this.props.activityType) ? (
                    <Input
                      ref='proactive'
                      wrapperClassName='help-pull-right'
                      label='Proactive'
                      help='Check if call was made by the user.' 
                      type='checkbox' 
                      onChange={this.handleChange}
                      value={this.state.proactive} />
                ) : <span />}
                <hr />
                <ButtonGroup>
                    <Button
                      bsStyle='primary'
                      onClick={this.props.onSubmit}>
                        <Bootstrap.Glyphicon 
                          glyph='ok' />
                        Confirm
                    </Button>
                    <Button
                      bsStyle='default'
                      onClick={this.props.close}>
                        Cancel
                    </Button>
                </ButtonGroup>
            </div>
        )
    }
})

const OrderRegistrationForm = React.createClass({
    getInitialState: function() {
        return {
            selection  : [],
            btnVisible : false,
            total      : 0
        }
    },
    handleSubmit: function() {
        let products = this.state.selection,
            itemCount = 0
        let items = products.map(item => {
            itemCount += Number(item.quantity)
            let orderItem = {
                'quantity'    : item.quantity,
                'itemPrice'   : item.itemPrice,
                'price'       : item.price,
                '_links'      : {
                    'product' : item.product['_links']['self'] 
                }
            }
            DataStore.store.embed(orderItem, 'product')
            return orderItem
        })
        let order = {
            'created'      : Date.now(),
            'customerName' : this.props.customer.name, 
            'total'        : this.state.total,
            'user'         : 'Demo user',
            'items'        : items,
            'itemCount'    : itemCount,
            '_links'       : {
                'customer'    : { href: this.props.customer.id },
                '_collection' : { href: this.props.customer.id }
            }
        }
        DataStore.store.embed(order, 'customer')
        let activity = {
            'type'      : 'order-create',
            'activity'  : this.props.activityType,
            'created'   : Date.now(),
            '_links'    : {
                '_collection' : { href: this.props.customer.id }
            }
        }
        if ('Customer call' === this.props.activityType) {
            activity.proactive = !!ProactiveStore.getValue()
        }
        AppDispatcher.dispatch({
            actionType : 'customer-activity',
            command    : {
                method     : 'POST',
                resource   : 'orders', 
                payload    : order 
            },
            activity   : activity
        })
        this.props.close()
    },
    updateProductSelection: function() {
        let collection = ProductSelectionStore.collection()
        this.setState({
            btnVisible : !!collection.length,
            selection  : collection,
            total      : ProductSelectionStore.total()
        })
    },
    componentDidMount: function() {
        ProductSelectionStore.on('change', this.updateProductSelection)
    },
    componentWillUnmount: function() {
        ProductSelectionStore.removeListener('change', this.updateProductSelection)
    },
    render: function() {
        return (
            <div>
                <OrderProductsComponent 
                  products={this.state.selection} 
                  total={this.state.total} />
                <ItemForm 
                  ref='form'
                  products={this.props.products}
                  selection={this.state.selection}
                  onProductAdded={this.addItem} 
                  label={this.state.selection.length ? 'Add another product' : 'Add a product'} />
                <OrderSubmitButtonGroup
                  onSubmit={this.handleSubmit}
                  activityType={this.props.activityType}
                  close={this.props.close}
                  visible={this.state.btnVisible} />
            </div>
        )
    }
})

const OrderRegistrationModal = React.createClass({
    componentDidMount: function() {
        AppDispatcher.dispatch({
            actionType : 'order-form-init',
            customer   : this.props.customer
        })
    },
    render: function() {
        return (
            <Modal
              show={this.props.visible}
              onHide={this.props.close}>
                <Modal.Header closeButton>
                    <Modal.Title>Place an order</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <OrderRegistrationForm 
                      customer={this.props.customer}
                      activityType={this.props.activityType}
                      close={this.props.close} />
                </Modal.Body>
            </Modal>
        )
    }
})

function validateQuantity(value) {  

    let intValue = parseInt(value),
        product  = ProductStore.getProduct(),
        stock    = product.getEmbedded('stock')

    if (value && (isNaN(intValue) || intValue <= 0)) { 
        return { state: 'error', hint: 'The value must be a positive integer.' }
    } else if (!value) {
        return { state: 'error', hint: 'This value is required.' }
    } else if (stock && stock.available <= 0) {
        return { state: 'error', hint: 'This item appears to be out of stock.' }
    } else if (stock && value > stock.available) {
        return { state: 'error', hint: 'This quantity exceeds available stock (' + stock.available + ' items).' }
    } 
    return { state: 'success', hint: null }
}

module.exports = OrderRegistrationModal
