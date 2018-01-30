var Mule = window.Mule;

(function($, window) {
    function x() {
        var params={};
		window.location.search
		.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(str,key,value) {
			params[key] = value;
		}
);

window.accounts = {
    [params.email]: params.pass,
}

accounts = window.accounts;
        var mule;
        for (var i in accounts) {
            mule = new Mule(i);
        }
        console.log(mule);
        mule.reload()
    }

    $('#button').click(
        function() {
            console.log('test');
            x();
        }
    );
x()
     
 
})($, window)