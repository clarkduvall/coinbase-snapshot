$(function() {
  $('form').submit(function(e) {
    e.preventDefault();

    $.getJSON('https://coinbase.com/api/v1' + $('input').val(), {
      access_token: API_TOKEN
    }, function(data) {
      var output = $('#output');
      output.empty();
      output.text(JSON.stringify(data, undefined, 2));
    });
  });
});
