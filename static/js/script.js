(function() {
  function round(num, places) {
    var rounder = Math.pow(10, places);
    return Math.round(num * rounder) / rounder;
  }

  function formatBTC(sel, amount) {
    $(sel).text(round(amount, 5) + ' BTC');
  }

  function formatUSD(sel, amount) {
    $(sel).text('$' + amount.toFixed(2));
  }

  function formatUSDDiff(sel, amount) {
    var text = '',
        $el = $(sel);

    $el.removeClass('pos neg');
    if (amount < 0) {
      text = '-$' + Math.abs(amount).toFixed(2);
      $el.addClass('neg');
    } else {
      text = '+$' + amount.toFixed(2);
      $el.addClass('pos');
    }
    $el.text(text);
  }

  function Dashboard(accessToken) {
    this.accessToken = accessToken;
    this.ajaxCalls = [];
  }

  Dashboard.prototype.fail = function() {
    if (this.failing) return;
    this.failing = true;

    clearTimeout(this.timeout);
    this.ajaxCalls.forEach(function(xhr) {
      xhr.abort();
    });
    this.ajaxCalls = [];

    function fail() {
      $('.error').show();
    }

    $.getJSON('/refresh', function(data) {
      this.accessToken = data.access_token;
      if (this.accessToken) {
        this.failing = false;
        $('.error').hide();
      } else {
        fail();
      }

      this.update();
    }.bind(this)).error(fail);
  };

  Dashboard.prototype.update = function() {
    clearTimeout(this.timeout);

    this.updateAnonymous();
    if (this.accessToken)
      this.updateAuthed();

    this.timeout = setTimeout(this.update.bind(this), 20000);
  };

  Dashboard.prototype.updateAnonymous = function() {
    this.getPrices(function() {
      formatUSD('.price-usd', this.priceUSD);
      document.title = this.priceUSD + ' • Coinbase Snapshot';
    }.bind(this));
  };

  Dashboard.prototype.updateAuthed = function() {
    var waiting = 3,
        updateUI = function() {
          $('.error').hide();

          var diff = this.balanceUSD + this.sellsUSD - this.buysUSD;

          formatBTC('.buys-btc', this.buysBTC);
          formatUSD('.buys-usd', this.buysUSD);
          formatBTC('.sells-btc', this.sellsBTC);
          formatUSD('.sells-usd', this.sellsUSD);
          formatBTC('.balance-btc', this.balanceBTC);
          formatUSD('.balance-usd', this.balanceUSD);
          formatUSDDiff('.purchase-diff', diff);

          if (this.ordersUSD > 0) {
            $('.orders').show();
            formatBTC('.orders-btc', this.ordersBTC);
            formatUSD('.orders-usd', this.ordersUSD);
          } else {
            $('.orders').hide();
          }

          $('.name').text(this.user);

          $('.auth').fadeIn('slow');
        }.bind(this);

    function done() {
      if (!--waiting)
        updateUI();
    }

    // Have to ask for more perms for this to work, probably not worth it.
    //this.getUser(done);
    this.getTransfers(done);
    this.getWorth(done);
    this.getMerchant(done);
  };

  Dashboard.prototype.getPrices = function(cb) {
    this.apiCall('/prices/spot_rate', function(data) {
      this.priceUSD = parseFloat(data.amount);

      cb && cb();
    }.bind(this), {}, true);
  };

  Dashboard.prototype.getUser = function(cb) {
    this.apiCall('/users', function(data) {
      this.user = data.users[0].user.name;

      cb && cb();
    }.bind(this));
  };

  Dashboard.prototype.getMerchant = function(cb) {
    this.paginatedApiCall('/orders', function(data) {
      this.ordersBTC = data.reduce(function(memo, cur) {
        var order = cur.order,
            total = order.status === 'completed' ?
                order.total_btc.cents / 100000000 : 0;

        return memo + total;
      }, 0);

      this.apiCall('/prices/sell', function(data) {
        // Can't have a negative balance, but Coinbase fees can make it
        // negative for small amounts.
        this.ordersUSD = Math.max(0, parseFloat(data.total.amount));

        cb && cb();
      }.bind(this), {qty: this.ordersBTC});
    }.bind(this), {}, {field: 'orders'});
  };

  Dashboard.prototype.getTransfers = function(cb) {
    this.paginatedApiCall('/transfers', function(data) {
      this.buysUSD = 0;
      this.buysBTC = 0;
      this.sellsUSD = 0;
      this.sellsBTC = 0;
      this.purchaseDiff = data.forEach(function(transferInfo) {
        var transfer = transferInfo.transfer;

        if (transfer.type === 'Buy') {
          this.buysUSD += parseFloat(transfer.total.amount);
          this.buysBTC += parseFloat(transfer.btc.amount);
        } else if (transfer.type === 'Sell') {
          this.sellsUSD += parseFloat(transfer.total.amount);
          this.sellsBTC += parseFloat(transfer.btc.amount);
        }
      }.bind(this));

      cb && cb();
    }.bind(this), {limit: 1000}, {field: 'transfers'});
  };

  Dashboard.prototype.getWorth = function(cb) {
    this.apiCall('/account/balance', function(data) {
      this.balanceBTC = parseFloat(data.amount);

      this.apiCall('/prices/sell', function(data) {
        // Can't have a negative balance, but Coinbase fees can make it
        // negative for small amounts.
        this.balanceUSD = Math.max(0, parseFloat(data.total.amount));

        cb && cb();
      }.bind(this), {qty: this.balanceBTC});
    }.bind(this));
  };

  Dashboard.prototype.apiCall = function(url, callback, data, noAuth) {
    data || (data = {});
    if (!noAuth)
      data.access_token = this.accessToken;

    var xhr = $.ajax({
      url: 'https://coinbase.com/api/v1' + url,
      data: data,
      dataType: 'jsonp',
      jsonpCallback: 'invalid_callback_param',
      success: callback,
      complete: function() {
        var index = this.ajaxCalls.indexOf(xhr);
        if (index !== -1)
          this.ajaxCalls.splice(index, 1);
      }.bind(this),
      error: this.fail.bind(this)
    });

    this.ajaxCalls.push(xhr);
  };

  Dashboard.prototype.paginatedApiCall = function(url, callback, data, opts) {
    var list = opts.list || [],
        field = opts.field;

    function next(pageData) {
      var curPage = pageData.current_page;

      list = list.concat(pageData[field]);
      if (curPage < pageData.num_pages) {
        this.paginatedApiCall(url, callback, data, {
          field: field,
          list: list,
          page: curPage + 1
        });
      } else {
        callback(list);
      }
    }

    data.page = opts.page || 1;
    this.apiCall(url, next.bind(this), data);
  };

  $(function() {
    var dashboard = new Dashboard(API_TOKEN);

    $('.refresh').click(function(e) {
      e.preventDefault();
      dashboard.update();
    });

    dashboard.update();
  });

})();
