import React                from 'react'

import DataStore            from '../../store/DataStore'
import OrdersView           from './OrdersView'

import {Panel}              from 'react-bootstrap'

const OrdersRoute = React.createClass({
    getInitialState: function() {
        return {
            order    : null,
            customer : null
        }
    },
    fetchOrder: function() {
        let order = DataStore.getItem('orders/' + this.props.params.id)
        if (order) {
            order.items.forEach(item => {
                item.product = item['_embedded']['product']
            })
            this.setState({
                order    : order,
                customer : order.getEmbedded('customer')
            })
        }
    },
    componentDidMount: function() {
        this.fetchOrder()
        DataStore.on('change', this.fetchOrder)
    },
    componentWillUnmount: function() {
        DataStore.removeListener('change', this.fetchOrder)
    },
    render: function() {
        if (!this.state.order || !this.state.customer)
            return (
                <span />
            )
        let customer = this.state.customer
        return (
            <Panel 
              header  = 'Orders'
              bsStyle = 'primary'>
                <ol className='breadcrumb'>
                    <li>
                        <a href='#/customers'>
                            Customers
                        </a>
                    </li>
                    <li>
                        <a href={'#/' + customer.id}>
                            {customer.name}
                        </a>
                    </li>
                    <li className='active'>
                        View order
                    </li>
                </ol>
                <OrdersView order={this.state.order} />
            </Panel>
        )
    }
})

module.exports = OrdersRoute
