var currentSveaAddress;
var customerIdentities;

function _$(selector, code)
{
    var container;
    if (typeof code !== 'undefined' && code !== '') {
        container = $$('.svea-ssn-container-' + code)[0];
    } else {
        var elements = $$('[class*=svea-ssn-container-]');
        if (elements.length) {
            container = elements[0];
        } else {
            container = $$('.svea-ssn-container')[0];
        }
    }
    return $(container).down(selector);
}

function sveaAddressChanged(addressSelector, container)
{
    var address;
    for (var i = 0; i < customerIdentities.length; i++) {
        if (customerIdentities[i].addressSelector == addressSelector) {
            address = customerIdentities[i];
            break;
        }
    }
    if (typeof address === 'undefined') {
        return;
    }

    if ($(container).down('.sveaShowAddresses')) {
        if (address.fullName == null) {
            var name = address.firstName + ' ' +
                address.lastName + '<br>';
        } else {
            var name = address.fullName + '<br>';
        }

        var label = $(container).down('.sveaShowAdressesLabel');
        var newLabel = label.cloneNode(true);
        $(newLabel).show();
        var addressBox = '<address>' + name +
            address.street + '<br>' +
            address.zipCode + ' ' +
            address.locality + '</address>';

        $(container).down('.sveaShowAddresses').update('')
            .insert(newLabel)
            .insert(addressBox);
    }

    // For onestep checkouts, check if fields visible and auto-fill
    if ($("billing:firstname").visible()) {
        $("billing:firstname").value = address.firstName;
        $("billing:lastname").value = address.lastName;
        $("billing:street1").value = address.street;
        $("billing:city").value = address.locality;
        $("billing:postcode").value = address.zipCode;

        ['firstname', 'lastname', 'street1', 'city', 'postcode']
            .each(function(item) {
                var id = 'billing:' + item;
                if ($(id)) {
                    $(id).addClassName('readonly');
                }
            });
    }
}

function sveaGetAddress(code)
{
    function startLoading()
    {
        var getAddressButton = _$('.get-address-btn', code);
        if (getAddressButton) {
            $(getAddressButton).addClassName('loading');
        }
    }

    function stopLoading()
    {
        var getAddressButton = _$('.get-address-btn', code);
        if (getAddressButton) {
            $(getAddressButton).removeClassName('loading');
        }
    }

    var ssn = _$('[name*=[svea_ssn]]', code).value,
        typeElement = _$('input:checked[name*=customerType]', code),
        type = typeElement ? typeElement.value : 0;

    var method = code || payment.currentMethod;
    if (!method) {
        method = $$('input:checked[name*=payment[method]]');
        if (method.length) {
            method = method[0].value;
        }
    }

    startLoading();
    new Ajax.Request(getAddressUrl, {
        parameters: {ssn: ssn, type: type, cc: currentCountry, method: method},
        onComplete: function (transport) {
            stopLoading();
        },
        onSuccess: function (transport) {
            var json = transport.responseText.evalJSON();
            if (json.accepted == false) {
                if (usingQuickCheckout) {
                    alert(json.errormessage);
                } else {
                    _$('.sveaShowAddresses', code).update("<span style='color:red'>" + json.errormessage + "</span>");
                }
                return;
            }

            // Show dropdown if company, show only text if private customer
            var addressesBox = _$('.sveaShowAddresses', code);
            if (addressesBox) {
                addressesBox.update('');
            }
            _$('.svea_address_selectbox', code).update('');
            customerIdentities = json.customerIdentity;
            if (customerIdentities.length > 1) {
                customerIdentities.each(function (item) {
                    var addressString = item.fullName + ', '
                        + item.street + ', '
                        + item.zipCode + ' '
                        + item.locality;

                    var option = new Element('option', {
                        'value': item.addressSelector
                    }).update(addressString);

                    _$('.svea_address_selectbox', code).insert(option);
                });
                _$('.svea_address_selectbox', code).show();
            } else {
                _$('.svea_address_selectbox', code).hide();
            }

            var container = _$('.svea_address_selectbox', code).up('.svea-ssn-container');
            currentSveaAddress = customerIdentities[0].addressSelector;
            sveaAddressChanged(currentSveaAddress, container);
            _$('.svea_address_selector', code).value = currentSveaAddress;
        }
    });
}

function setCustomerTypeRadioThing()
{
    var customerType = $(this).value;
    if (currentCountry == 'NL' || currentCountry == 'DE') {
        if (customerType == 1) {
            $$(".forNLDE").invoke('hide');
            $$(".forNLDEcompany").invoke('show');
        } else {
            $$(".forNLDEcompany").invoke('hide');
            $$(".forNLDE").invoke('show');
        }
    } else {
        if (customerType == 1) {
            $$(".label_ssn_customerType_0").invoke('hide');
            $$(".label_ssn_customerType_1").invoke('show');
        } else {
            $$(".label_ssn_customerType_1").invoke('hide');
            $$(".label_ssn_customerType_0").invoke('show');
        }
    }
}

function sveaAddressSelectChanged()
{
    currentSveaAddress = $F(this);
    var container = $(this).up('.svea-ssn-container');
    sveaAddressChanged(currentSveaAddress, container);
    $(container).down('.svea_address_selector').value = currentSveaAddress;
}

function setupAddressSelectorObservers()
{
    $$('.svea_address_selectbox').invoke('observe', 'change', sveaAddressSelectChanged);
    $$('.payment_form_customerType_0').invoke('observe', 'change', setCustomerTypeRadioThing);
    $$('.payment_form_customerType_1').invoke('observe', 'change', setCustomerTypeRadioThing);
}

$(document).observe('dom:loaded', function () {
    setupAddressSelectorObservers();
});