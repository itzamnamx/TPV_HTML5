$(document).ready(function() {
    main.initialize();
});

//Main Scope
var main = {};
/**
 * The current Session
 * @type Session
 */
main.session;
/**
 * Indicates if the scale is currently active
 * @type Boolean
 */
main.scaleActive = false;
/**
 * Used to cancel the lookup page search progress bar interval
 * @type Number
 */
main.intervalId;
/**
 * Delay (ms) until returning to the main page after completing a transaction
 * @type Number
 */
main.completeDelay = 3000;

/**
 * Initialize the app
 * @returns {undefined}
 */
main.initialize = function() {
    //Load Data
    data.initialize();
    
    //Setup StillThere
    stillthere.timeoutStillThere = 60000; //2 minutes
    stillthere.timeout = 65000; //2.5 minutes
    stillthere.addEventListener(stillthere.Event.STILL_THERE, function() {
        stillthere.overlay.find('.message').html('Desea Continuar Ordenando?');
    });
    stillthere.addEventListener(stillthere.Event.TIMEOUT, function() {
        stillthere.overlay.find('.message').html('Toque para Continuar');
        main.start();
    });
    
    //Setup Scanner/Swiper/Scale
    scanner.addTrigger('.current');
    swiper.addTrigger('.current');
    scale.addEventListener(scale.Event.ADDED, main.scaleItemAdded);
    scale.addEventListener(scale.Event.REMOVED, main.scaleItemRemoved);    
    $('.simulate.card').click(function() {
        var e = document.createEvent('Events');
        e.initEvent('keypress', true, true);
        e.keyCode = swiper.bypass;
        document.dispatchEvent(e); 
    });
    
    /*
     * Add Listeners
     */    
    //Page-Startup
    $('#page-startup .start').click(function() {
        startup.stopTesting();
        main.start();
    });
    
    //Page-Initial
    $('#page-initial').on(flipper.Event.BEFORE_OPEN, function() {
        document.getElementById('background-video').play();
    });
    $('#page-initial').on(flipper.Event.AFTER_CLOSE, function() {
        document.getElementById('background-video').pause();
    });
    $('#page-initial').on(scanner.EVENT, main.startScanner);
    $('#page-initial .start-button.english').click(main.startEnglish);
    $('#page-initial .start-button.spanish').click(main.startSpanish);
    
    //Page-Checkout
    $('#page-checkout').on(flipper.Event.BEFORE_OPEN, function() {
        //scanner.scanning = true;
        $('#page-checkout #item-search-query').val('');
        main.foodSearch();
        $('.product-delete').show();
    });
    $('#page-checkout').on(flipper.Event.AFTER_CLOSE, function() {
        //scanner.scanning = false;
        $('.product-delete').hide();
    });
    $('#page-checkout').on(scanner.EVENT, main.checkoutScanner);
    $('#page-checkout #lookup-item').click(function() {
        flipper.openPage('#page-lookup');
    });
    $('#page-checkout #large-item').click(function() {
        flipper.openOverlay('#overlay-large-item');
    });
    $('#page-checkout #type-in-sku').click(function() {
        flipper.openOverlay('#overlay-type-in-sku');
    });
    $('#page-checkout #pay-now').click(function() {
        flipper.openPage('#page-payment-options');
    });
         
    $('#page-checkout').on('beforesearch', main.lookupFoodBeforeSearch);
    $('#page-checkout').on('aftersearch', main.lookupFoodAfterSearch);
    $('#page-checkout #item-search-query').keyup(main.lookupFoodStartProgress);
    
    //Page-Lookup
    $('#page-lookup').on(flipper.Event.BEFORE_OPEN, function() {
        $('#page-lookup #item-search-query').val('');
        main.productSearch();
    });
    $('#page-lookup').on('beforesearch', main.lookupBeforeSearch);
    $('#page-lookup').on('aftersearch', main.lookupAfterSearch);
    $('#page-lookup #item-search-query').keyup(main.lookupStartProgress);
    
    //Page-Payment-Options
    $('#page-payment-options .payment-method.invalid').click(function() {
        flipper.openPage('#page-invalid-payment-type');
    });
    $('#page-payment-options .payment-method.card').click(function() {
        flipper.openPage('#page-payment');
    });
    
    $('#page-payment-options .payment-method.cash').click(function() {
        flipper.openPage('#page-payment-id-nip');
    });
    
    
    //Page-Payment
    $('#page-payment').on(flipper.Event.BEFORE_OPEN, function() {
        //swiper.scanning = true;
    });
    $('#page-payment').on(flipper.Event.AFTER_CLOSE, function() {
        //swiper.scanning = false;
    });
    $('#page-payment').on(swiper.EVENT, main.paymentSwiper);    
    $('#page-payment').on('beforesearch', main.lookupBeforeSearch);
    $('#page-payment').on('aftersearch', main.lookupAfterSearch);
    $('#page-payment #card-search-query').keyup(main.paymentRFID);
    
    //Page-Payment ID & NIP
    $('#page-payment-id-nip').on(flipper.Event.BEFORE_OPEN, function() {
        swiper.scanning = true;    
    });
    $('#page-payment-id-nip').on(flipper.Event.AFTER_CLOSE, function() {
        swiper.scanning = false;
    });
    $('#page-payment-id-nip').on(swiper.EVENT, main.paymentSwiper);    
    //Page-Complete
    $('#page-complete').on(flipper.Event.BEFORE_OPEN, function() {
        document.getElementById('complete-video').play();
    });
    $('#page-complete').on(flipper.Event.AFTER_OPEN, function() {
        setTimeout(function() {
            main.start();
        }, main.completeDelay);
    });
    $('#page-complete').on(flipper.Event.AFTER_CLOSE, function() {
        document.getElementById('complete-video').pause();
    });
    
    //Buttons
    $('.return-checkout').click(function() {
        flipper.openPage('#page-checkout');
    });
    $('.call-attendant').click(function() {
        flipper.openOverlay('#overlay-call-attendant');
    });
    $('.return-payment-methods').click(function() {
        flipper.openPage('#page-payment-options');
    });
    $('.return-main-menu').click(function() {
        flipper.openOverlay('#overlay-cancel');
    });
    
    //Overlay Close Buttons
    $('#overlay-error .continue').click(main.closeOverlay);
    $('#overlay-large-item').click(main.closeOverlay);
    $('#overlay-large-item').on(scanner.EVENT, main.closeOverlay);
    $('#overlay-large-item .cancel').click(main.closeOverlay);
    $('#overlay-type-in-sku .cancel').click(main.closeOverlay);
    $('#overlay-call-attendant .continue').click(main.closeOverlay);
    $('#overlay-cancel .return').click(main.closeOverlay);
    
    //SKU Overlay
    $('#overlay-type-in-sku').on(flipper.Event.BEFORE_OPEN, function() {
        scanner.scanning = false;
        $('#overlay-type-in-sku #sku-query').val('');
    });
    $('#overlay-type-in-sku').on(flipper.Event.AFTER_CLOSE, function() {
        scanner.scanning = true;
    });    
    $('#overlay-type-in-sku .continue').click(function() {
        var sku = $('#overlay-type-in-sku #sku-query').val();
        flipper.closeOverlay();
        if (sku.length > 0) {
            main.addItemToReceipt(sku);
        }
    });
    $('#overlay-cancel .confirm').click(function() {
        flipper.closeOverlay();
        main.start();
    });    
    
    //Scale Overlay
    $('#overlay-scale .cancel').click(function() {
        main.scaleActive = false;
        scanner.scanning = true;
        flipper.closeOverlay('#overlay-scale');
    });
    
    flipper.openPage('#page-startup');
    startup.startTesting();
};

/**
 * Starts the app and resets the current session.
 * @returns {undefined}
 */
main.start = function() {
    main.session = new Session();
    scanner.scanning = true;
    swiper.scanning = false;
    main.scaleActive = false;
    
    //Reset items
    $('.receipt').empty();
    $('.total .amount').html('$0.00');    
    $('#page-checkout #pay-now').removeClass('active');
    
    flipper.openPage('#page-initial');
};


/*******************************************************************************
 * Actions
 ******************************************************************************/
/**
 * Displays an error message overlay.
 * @param {string} message the error message to display
 * @returns {undefined}
 */
main.showError = function(message) {
    $('#overlay-error .error').html(message);
    flipper.openOverlay('#overlay-error');
};

/**
 * Searches for a product by the given query.
 * <p>
 * If the query is undefined, all products will be loaded.
 * @param {string} query the product to search for, or undefined to display 
 *      all products
 * @returns {undefined}
 */
main.foodSearch = function(query) {
    $('#page-checkout').trigger('beforesearch');
    if(typeof query === 'undefined') {
        //mock delay for loading animation
        setTimeout(function() {
            for (var i = 0; i < data.productsArray.length; i++) {
                var product = data.productsArray[i];
                var productElement = product.getSearchResult();
                
                if (i < 8) {
                    productElement.addClass('search-result-animation-' + (i+1).toString());
                }
                
                productElement.click(main.lookupItemClicked);
                $('#page-checkout .search-results').append(productElement);
            }
            $('#page-checkout').trigger('aftersearch');
        }, 2000);
    }
    else {
        setTimeout(function() {
            for (var i = 0; i < data.productsArray.length; i++) {
                var product = data.productsArray[i];

                var searchTerm = query.toLowerCase();
                var matchTerm = product.name.toLowerCase();
                if (matchTerm.indexOf(searchTerm) > -1) {
                    var productElement = product.getSearchResult();

                    if(i < 8) {
                        productElement.addClass('search-result-animation-' + (i+1).toString());
                    }

                    productElement.click(main.lookupItemClicked);
                    $('#page-checkout .search-results').append(productElement);
                }
            }
            $('#page-checkout').trigger('aftersearch');
        }, 2000);
    }
};
/**
 * Searches for a product by the given query.
 * <p>
 * If the query is undefined, all products will be loaded.
 * @param {string} query the product to search for, or undefined to display 
 *      all products
 * @returns {undefined}
 */
main.productSearch = function(query) {
    $('#page-lookup').trigger('beforesearch');
    if(typeof query === 'undefined') {
        //mock delay for loading animation
        setTimeout(function() {
            for (var i = 0; i < data.productsArray.length; i++) {
                var product = data.productsArray[i];
                var productElement = product.getSearchResult();
                
                if (i < 8) {
                    productElement.addClass('search-result-animation-' + (i+1).toString());
                }
                
                productElement.click(main.lookupItemClicked);
                $('#page-lookup .search-results').append(productElement);
            }
            $('#page-lookup').trigger('aftersearch');
        }, 2000);
    }
    else {
        setTimeout(function() {
            for (var i = 0; i < data.productsArray.length; i++) {
                var product = data.productsArray[i];

                var searchTerm = query.toLowerCase();
                var matchTerm = product.name.toLowerCase();
                if (matchTerm.indexOf(searchTerm) > -1) {
                    var productElement = product.getSearchResult();

                    if(i < 8) {
                        productElement.addClass('search-result-animation-' + (i+1).toString());
                    }

                    productElement.click(main.lookupItemClicked);
                    $('#page-lookup .search-results').append(productElement);
                }
            }
            $('#page-lookup').trigger('aftersearch');
        }, 2000);
    }
};

/**
 * Searches for a employee by the given query.
 * <p>
 * If the query is undefined, all products will be loaded.
 * @param {string} query the product to search for, or undefined to display 
 *      all products
 * @returns {undefined}
 */
main.employeeSearch = function(query) {    
        setTimeout(function() {
            for (var i = 0; i < data.productsArray.length; i++) {
                var product = data.productsArray[i];

                var searchTerm = query.toLowerCase();
                var matchTerm = product.name.toLowerCase();
                if (matchTerm.indexOf(searchTerm) > -1) {
                    var productElement = product.getSearchResult();

                    if(i < 8) {
                        productElement.addClass('search-result-animation-' + (i+1).toString());
                    }

                    productElement.click(main.lookupItemClicked);
                    $('#page-payment .search-results').append(productElement);
                }
            }
            $('#page-payment').trigger('aftersearch');
        }, 2000);
    
};

/**
 * Adds an item to the current session's receipt.
 * @param {string|Object} sku the item's SKU, or the ReceiptItem object to add
 * @returns {undefined}
 */
main.addItemToReceipt = function(sku) {
    var product = sku;
    if (typeof sku === 'string') {
        product = data.productsSku[sku];
        if (typeof product === 'undefined') {
            product = data.productsPlu[sku];
        }
    }
    
    if (typeof product === 'undefined') {
        main.showError('Invalid product, please see an attendant for assistance');
        return;
    }    
   
    main.session.receipt.addItem(sku);
    var receipt = $('.receipt-container .receipt');
    receipt.scrollTop(receipt.prop("scrollHeight"));
    $('.receipt-container .receipt-totals .receipt-subtotal .amount').html(main.formatCurrency(main.session.receipt.getSubTotal()));
    $('.receipt-container .receipt-totals .receipt-tax .amount').html(main.formatCurrency(main.session.receipt.getTaxes()));
    $('.receipt-container .receipt-totals .receipt-total .amount').html(main.formatCurrency(main.session.receipt.getGrandTotal()));

    if(main.session.receipt.recieptItems.length > 0)
    {
        $('#page-checkout #pay-now').addClass('active');
    }
    else
    {
        $('#page-checkout #pay-now').removeClass('active');
    }
   
};

/**
 * Remove the indicated item from the receipt data structure and the receipt container
 * @param sku the productId to remove
 */
main.removeItemToReceipt = function(sku) {

    main.session.receipt.removeItem(sku);
    var receipt = $('.receipt-container .receipt');
    receipt.scrollTop(receipt.prop("scrollHeight"));
    $('.receipt-container .receipt-totals .receipt-subtotal .amount').html(main.formatCurrency(main.session.receipt.getSubTotal()));
    $('.receipt-container .receipt-totals .receipt-tax .amount').html(main.formatCurrency(main.session.receipt.getTaxes()));
    $('.receipt-container .receipt-totals .receipt-total .amount').html(main.formatCurrency(main.session.receipt.getGrandTotal()));
    if(main.session.receipt.recieptItems.length > 0)
    {
        $('#page-checkout #pay-now').addClass('active');
    }
    else
    {
        $('#page-checkout #pay-now').removeClass('active');
    }
};

/*******************************************************************************
 * Listeners
 ******************************************************************************/
/**
 * Start the app with the English locale.
 * @returns {undefined}
 */
main.startEnglish = function() { 
    locales.setLanguage(locales.Languages.ENGLISH);
    flipper.openPage('#page-checkout');
};
/**
 * Start the app with the Spanish locale.
 * @returns {undefined}
 */
main.startSpanish = function() {
    locales.setLanguage(locales.Languages.SPANISH);
    flipper.openPage('#page-checkout');
};
/**
 * Start the app with the Spanish locale and add the scanned item.
 * @param {Event} e 
 * @param {string} sku item SKU to add
 * @returns {undefined}
 */
main.startScanner = function(e, sku) {
    main.startSpanish();
    main.addItemToReceipt(sku);
};

/**
 * Called whenever a scan event occurs on the checkout page.
 * @param {Event} e the scan event
 * @param {string} sku the SKU scanned
 * @returns {undefined}
 */
main.checkoutScanner = function(e, sku) {
    main.closeOverlay();
    main.addItemToReceipt(sku);
};
/**
 * Closes the current overlay.
 * <p>
 * This is equivalent to flipper.closeOverlay(), but if flipper.closeOverlay 
 * is added as an event listener, an error will occur since the argument 
 * passed to flipper.closeOverlay will be an Event object instead of 
 * undefined.
 * @returns {undefined}
 */
main.closeOverlay = function() {
    flipper.closeOverlay();
};

/**
 * Animates out the current search results for a new set of results.
 * @returns {undefined}
 */
main.lookupBeforeSearch = function() {
    if ($('#page-lookup .search-results .search-result').length > 0) {
        $('#page-lookup .search-results .search-result').addClass('search-result-animation-out');
        setTimeout(function() {
            $('#page-lookup .search-results').empty();
            $('#modules .loading-animation').clone().appendTo('#page-lookup .search-results');
        }, 1000);
    }
    else {
        $('#page-lookup .search-results').empty();
        $('#modules .loading-animation').clone().appendTo('#page-lookup .search-results');
    }
};
/**
 * Animates in the new search results.
 * @returns {undefined}
 */
main.lookupAfterSearch = function() {
    $('#page-lookup .search-results .loading-animation').remove();
    $('#page-lookup .search-results .search-result').addClass('search-result-animation-in');
    setTimeout(function() {
        $('#page-lookup .search-results .search-result').removeClass('search-result-animation-in');
        $('#page-lookup .search-results .search-result').removeClass('search-result-animation-1');
        $('#page-lookup .search-results .search-result').removeClass('search-result-animation-2');
        $('#page-lookup .search-results .search-result').removeClass('search-result-animation-3');
        $('#page-lookup .search-results .search-result').removeClass('search-result-animation-4');
        $('#page-lookup .search-results .search-result').removeClass('search-result-animation-5');
        $('#page-lookup .search-results .search-result').removeClass('search-result-animation-6');
        $('#page-lookup .search-results .search-result').removeClass('search-result-animation-7');
        $('#page-lookup .search-results .search-result').removeClass('search-result-animation-8');
    }, 1000);
};

/**
 * Animates out the current search results for a new set of results.
 * @returns {undefined}
 */
main.lookupFoodBeforeSearch = function() {
    if ($('#page-checkout .search-results .search-result').length > 0) {
        $('#page-checkout .search-results .search-result').addClass('search-result-animation-out');
        setTimeout(function() {
            $('#page-checkout .search-results').empty();
            $('#modules .loading-animation').clone().appendTo('#page-checkout .search-results');
        }, 1000);
    }
    else {
        $('#page-checkout .search-results').empty();
        $('#modules .loading-animation').clone().appendTo('#page-checkout .search-results');
    }
};
/**
 * Animates in the new search results.
 * @returns {undefined}
 */
main.lookupFoodAfterSearch = function() {
    $('#page-checkout .search-results .loading-animation').remove();
    $('#page-checkout .search-results .search-result').addClass('search-result-animation-in');
    setTimeout(function() {
        $('#page-checkout .search-results .search-result').removeClass('search-result-animation-in');
        $('#page-checkout .search-results .search-result').removeClass('search-result-animation-1');
        $('#page-checkout .search-results .search-result').removeClass('search-result-animation-2');
        $('#page-checkout .search-results .search-result').removeClass('search-result-animation-3');
        $('#page-checkout .search-results .search-result').removeClass('search-result-animation-4');
        $('#page-checkout .search-results .search-result').removeClass('search-result-animation-5');
        $('#page-checkout .search-results .search-result').removeClass('search-result-animation-6');
        $('#page-checkout .search-results .search-result').removeClass('search-result-animation-7');
        $('#page-checkout .search-results .search-result').removeClass('search-result-animation-8');
    }, 1000);
};

/**
 * Adds the search result item clicked on to the session's receipt.
 * @returns {undefined}
 */
main.lookupItemClicked = function() {
    var sku = $('.title .sku', $(this)).html();   
    flipper.openPage('#page-checkout');    
    main.addItemToReceipt(sku);
};

/**
 * Starts a progress bar whenever a key is pressed.
 * <p>
 * This method resets the progress bar. When the progress bar is finished 
 * (the user has not pressed any keys for a short amount of time), the 
 * user's input will then be sent to search for products.
 * @returns {undefined}
 */
main.lookupStartProgress = function() {
    clearInterval(main.intervalId);
    var i = 0;
    main.intervalId = setInterval(function(){
        main.lookupUpdateProgress(i);
        i++;
    }, 1);
};
/**
 * Update the lookup progress bar with the given value.
 * <p>
 * Once the progress bar has reached its max value, the user's input will 
 * be passed to main.productSearch().
 * @param {number} value the value to set the progress bar to
 * @returns {undefined}
 */
main.lookupUpdateProgress = function(value) {
    var progress = $('#page-lookup #search-timer-progress');
    
    if (value < progress.attr('max')) {
        progress.attr('value', value);
    }
    else {
        clearInterval(main.intervalId);
        progress.attr('value', 0);
        var searchQuery = $('#page-lookup #item-search-query').val();
        main.productSearch(searchQuery);
    }
};

/**
 * Starts a progress bar whenever a key is pressed.
 * <p>
 * This method resets the progress bar. When the progress bar is finished 
 * (the user has not pressed any keys for a short amount of time), the 
 * user's input will then be sent to search for products.
 * @returns {undefined}
 */
main.lookupFoodStartProgress = function() {
    clearInterval(main.intervalId);
    var i = 0;
    main.intervalId = setInterval(function(){
        main.lookupFoodUpdateProgress(i);
        i++;
    }, 1);
};
/**
 * Update the lookup progress bar with the given value.
 * <p>
 * Once the progress bar has reached its max value, the user's input will 
 * be passed to main.productSearch().
 * @param {number} value the value to set the progress bar to
 * @returns {undefined}
 */
main.lookupFoodUpdateProgress = function(value) {
    var progress = $('#page-checkout #search-timer-progress');
    
    if (value < progress.attr('max')) {
        progress.attr('value', value);
    }
    else {
        clearInterval(main.intervalId);
        progress.attr('value', 0);
        var searchQuery = $('#page-checkout #item-search-query').val();
        main.productSearch(searchQuery);
    }
};

/**
 * Starts a progress bar whenever a key is pressed.
 * <p>
 * This method resets the progress bar. When the progress bar is finished 
 * (the user has not pressed any keys for a short amount of time), the 
 * user's input will then be sent to search for employee.
 * @returns {undefined}
 */
main.lookupEmployeeStartProgress = function() {
    clearInterval(main.intervalId);
    var i = 0;
    main.intervalId = setInterval(function(){
        main.lookupEmployeeUpdateProgress(i);
        i++;
    }, 1);
};
/**
 * Update the lookup progress bar with the given value.
 * <p>
 * Once the progress bar has reached its max value, the user's input will 
 * be passed to main.productSearch().
 * @param {number} value the value to set the progress bar to
 * @returns {undefined}
 */
main.lookupEmployeeUpdateProgress = function(value) {
    var progress = $('#page-payment #search-timer-progress');
    
    if (value < progress.attr('max')) {
        progress.attr('value', value);
    }
    else {
        clearInterval(main.intervalId);
        progress.attr('value', 0);
        var searchQuery = $('#page-payment #card-search-query').val();
        
        main.employeeSearch(searchQuery);
    }
};

/**
 * Called whenever a swipe event occurs on the payment page.
 * <p>
 * This method will verify the card and process payment, or alert the user 
 * that there was an error with their payment.
 * @param {Event} e the swipe event
 * @param {Card} card the Card swiped
 * @returns {undefined}
 */
main.paymentSwiper = function(e, card) {    
    var amount = main.currencyToFloat($('#page-payment .receipt-total .amount').html());    
    stripe.chargeCard(card, amount, function(response) {
        if (response.success) {
            flipper.openPage('#page-complete');
        }
        else {
            main.showError('There was a problem accepting your card: ' + response.message);
        }
    });
};

/**
 * Called whenever a swipe event occurs on the payment page.
 * <p>
 * This method will verify the card and process payment, or alert the user 
 * that there was an error with their payment.
 * @param {Event} e the swipe event
 * @param {Card} card the Card swiped
 * @returns {undefined}
 */
main.paymentRFID = function(e, card) {
    var card = $('#page-payment #card-search-query').val();
    var amount = main.currencyToFloat($('#page-payment .receipt-total .amount').html());
    flipper.openPage('#page-complete');
    /*var empleado = employee.getSearchResult(card);
    stripe.chargeCard(card, amount, function(response) {
        if (response.success) {
            flipper.openPage('#page-complete');
        }
        else {
            main.showError('There was a problem accepting your card: ' + response.message);
        }
    });
    */
};

/**
 * Called whenever an item is added to the scale. 
 * <p>
 * This will display a loading animation to indicate to the user that the 
 * scale is processing the item's weight.
 * @returns {undefined}
 */
main.scaleItemAdded = function() {
    $('#overlay-scale .message').hide();
    $('#overlay-scale .wait').show();
};
/**
 * Called whenever an item is removed from the scale.
 * <p>
 * This will display a message to the user indicating that no item is currently 
 * on the scale and that it is ready for an item to be placed.
 * @returns {undefined}
 */
main.scaleItemRemoved = function() {
    $('#overlay-scale .wait').hide();  
    $('#overlay-scale .message').show();
};

/*******************************************************************************
 * Helper Functions
 ******************************************************************************/
/**
 * Converts a Number value into a currency formatted String.
 * @param {number} value the value to format
 * @returns {string} value formatted as a currency String
 */
main.formatCurrency = function(value) {
    return main.session.currency + parseFloat(value, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString();
};
/**
 * Converts a currency String into a Number
 * @param {string} value the currency String to convert to a Number
 * @returns {number} the value as a Number
 */
main.currencyToFloat = function(value) {
    return parseFloat(value.substr(1));
};
