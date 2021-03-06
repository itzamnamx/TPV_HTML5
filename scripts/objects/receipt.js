/**
 * A Receipt object represents the receipt viewed on the app's screen. It 
 * contains an array of ReceiptItem objects, which loosely wraps the Product 
 * object.
 * @returns {Receipt}
 */
function Receipt() {
    //Protected this scope
    var self = this;
    
    /**
     * Array of ReceiptItem objects
     * @type Array
     */
    this.recieptItems = [];
    
    /**
     * Adds an item to this Receipt.
     * <p>
     * If the passed parameter is a String, the appropriate Product will 
     * be retrieved by its SKU or PLU.
     * <p>
     * Additionally, this function will create a receipt item div and 
     * append it to every receipt container.
     * @param {ReceiptItem|string} id the ReceiptItem to add, or the 
     *      Product SKU or PLU
     * @returns {undefined}
     */
    this.addItem = function(item) {
        var receiptItem = item;
        if (typeof item === 'string') {
            var product = data.productsSku[item];
            if (product === undefined) {
                product = data.productsPlu[item];
            }
            var consecutive = self.getItemConsecutive(product);
            receiptItem = new ReceiptItem(product, consecutive);
        }
        
        self.recieptItems.push(receiptItem);

        var receiptItemDiv = receiptItem.getReceiptItemDiv();

        $('.receipt-container .receipt').append(receiptItemDiv);
    };

    /**
     * Get the next consecutive of the element according to the current ticket elements in the array
     * @param product
     * @returns {number}
     */
    this.getItemConsecutive = function(product) {
        var counter = 0;
        for(var i = 0; i < self.recieptItems.length; i++) {
            if (self.recieptItems[i].getProductId() === product.getCanonicalProductId()) {
                counter++;
            }
        }
        return ++counter;
    };

    /**
     * Remove item from the Receipt and deletes the div section appended to the container
     * @param product
     */
    this.removeItem = function(productId) {
        for (var i = 0; i < self.recieptItems.length; i++) {
            var prod = self.recieptItems[i];
            if (prod.getReceiptItemId() === productId) {
                index = i;
                break;
            }
        }
        self.recieptItems.splice(index, index + 1);

        $('.receipt-container .receipt #'+productId).remove();
        //Remove is required to call twice to delete the div created in the Payment page
        //TODO find a best approach
        $('.receipt-container .receipt #'+productId).remove();

    };

    /**
     * Retrieves the sub total of this Receipt.
     * @returns {Number} Receipt sub total
     */
    this.getSubTotal = function() {
        var sub = 0;
        for (var i = 0; i < self.recieptItems.length; i++) {
            sub += self.recieptItems[i].getPrice();
        }
        return sub;
    };
    /**
     * Retrieves the tax of this Receipt.
     * @returns {Number} Receipt tax
     */
    this.getTaxes = function() {
        var sub = self.getSubTotal();
        return sub * 0.16;
    };
    /**
     * Retrieves the grand total of this Receipt.
     * @returns {Number} Receipt grand total
     */
    this.getGrandTotal = function() {
        return self.getSubTotal() + self.getTaxes();
    };
}