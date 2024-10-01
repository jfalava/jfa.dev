export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const { hostname, pathname, search } = url;

		let destinationHost: string = 'jfa.dev';
		let destinationPath: string = '/';
		const statusCode = 301;

		switch (hostname) {
			case 'cv.jfa.dev':
				destinationPath = '/cv';
				break;
			case 'landing.jfa.dev':
				destinationPath = '';
				break;
			case 'links.jfa.dev':
				destinationPath = '';
				break;
		}

		const destinationURL = `https://${destinationHost}${destinationPath}${pathname}${search}`;
		return Response.redirect(destinationURL, statusCode);
	},
} satisfies ExportedHandler;
