module.exports = function transformer(file, api) {
	const j = api.jscodeshift;
	const source = j(file.source);
	const getFirstNode = () => source.find(j.Program).get('body', 0).node;

  // Save the comments attached to the first node
	const firstNode = getFirstNode();
	const { comments } = firstNode;

	const injectLucidImport = (pathToInjectAfter, local, imported) => {
		const existingLocalImportsCount = source
			.find(j.ImportDefaultSpecifier)
			.filter((path) => path.node.local.name === local)
			.length;

		// Make sure we don't add something that's already imported
		if (existingLocalImportsCount > 0) {
			return null;
		}

		j(pathToInjectAfter).insertAfter(
			j.importDeclaration(
				[j.importDefaultSpecifier(j.identifier(local))],
				j.literal(`lucid-ui/${imported}`)
			)
		);
	};

	source
		.find(j.ImportDeclaration)
		.filter((importPath) => importPath.node.source.value === 'lucid-ui')
		.forEach((importPath) => {
			j(importPath).find(j.ImportNamespaceSpecifier).forEach((defaultPath) => {
				// import * as lucid from 'lucid-ui';
				const local = defaultPath.node.local.name;

				// find and modify all destructured variables for the * import
				source
					.find(j.VariableDeclarator)
					.filter(
						(variablePath) => variablePath.node && variablePath.node.init && variablePath.node.init.name === local
					)
					.forEach((variablePath) => {
						j(variablePath.node.id.properties).forEach((propertyPath) => {
							if (propertyPath.node.value.type === 'ObjectPattern') {
								const local = propertyPath.node.key.name + 'Internal'; // kinda hack way to handle the logger.logger edge case
								const imported = propertyPath.node.key.name;
								const objectPattern = propertyPath.node.value;

								j(variablePath.parent).insertBefore(
									j.variableDeclaration('const', [
										j.variableDeclarator(objectPattern, j.identifier(local)),
									])
								);

								injectLucidImport(importPath, local, imported);
							} else {
								const local = propertyPath.node.value.name;
								const imported = propertyPath.node.key.name;
								injectLucidImport(importPath, local, imported);
							}
						});

						j(variablePath.parent).replaceWith();
					});

				// find and modify all regular variables for the * import
				source
					.find(j.VariableDeclarator)
					.filter((path) => path.node && path.node.init && path.node.init.object && path.node.init.object.name === local)
					.forEach((path) => {
						const local = path.node.id.name;
						const imported = path.node.init.property.name;
						injectLucidImport(importPath, local, imported);
						j(path.parent).replaceWith();
					});

				j(defaultPath.parent).remove(); // get rid of the * import
			});

			j(importPath).find(j.ImportSpecifier).forEach((path) => {
				// import { ... } from 'lucid-ui';
				const imported = path.node.imported.name;
				const local = path.node.local.name;
				injectLucidImport(importPath, local, imported);
			});

			j(importPath).replaceWith();
		});

	// If the first node has been modified or deleted, reattach the comments
	const firstNode2 = getFirstNode();
	if (firstNode2 !== firstNode) {
		firstNode2.comments = comments;
	}

	return source.toSource({
		quote: 'single',
		useTabs: true,
	});
};
