$(function() {
  $('form').submit(function(e) {
    e.preventDefault();

    $.ajax({
      url: 'https://coinbase.com/api/v1' + $('input').val(),
      data: {access_token: API_TOKEN},
      dataType: 'jsonp',
      success: function(data) {
        var output = $('#output');
        output.empty();
        output.text(JSON.stringify(data, undefined, 2));
      }
    });
  });
});
