# Real-World Tax Model

This project now uses a hybrid tax model that matches common retail and ERP behavior:

- The company sets a default tax rate at the organization level.
- Each product can override that default with its own tax rate.
- Cashiers do not manually enter tax during normal sales or purchase receiving.
- The system calculates tax from the selected product lines and stores it on the invoice/receipt.

## Why this approach

- Retail businesses often need one default tax rule, but some products are tax-exempt or taxed differently.
- This keeps the cashier workflow simple.
- It still supports realistic accounting and reporting.

## What was implemented

- Organization tax rate stored on the tenant record.
- Product-level tax rate stored on each product.
- Sales invoices and purchase receipts calculate tax per line item.
- Line-item tax values are persisted in the database.
- Receipt and invoice printing only shows tax when tax actually exists.
- Product forms and org settings now expose the relevant tax configuration.

## Practical rule

- If a product has its own tax rate, that value is used.
- Otherwise the organization default is used.
- If both are zero, tax is hidden from the cashier flow.

