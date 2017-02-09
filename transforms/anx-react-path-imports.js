module.exports = function transformer(file, api) {
	const j = api.jscodeshift;
	const source = j(file.source);

	const injectAnxReactImport = (pathToInjectAfter, local, imported, extra) => {
		const inject = extra ? `/${extra}` : '';

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
				j.literal(`anx-react${inject}/${imported}`)
			)
		);
	};

	const modifyAllVariables = (pathToInjectAfter, local, extra) => {
		// find and modify all destructured variables
		source
			.find(j.VariableDeclarator)
			.filter(
				(variablePath) => variablePath.node && variablePath.node.init && variablePath.node.init.name === local
			)
			.forEach((variablePath) => {
				j(variablePath.node.id.properties).forEach((propertyPath) => {
					if (propertyPath.node.value.type === 'ObjectPattern') {
						const local = propertyPath.node.key.name;
						const imported = propertyPath.node.key.name;
						const objectPattern = propertyPath.node.value;
						j(variablePath.parent).insertBefore(
							j.variableDeclaration('const', [
								j.variableDeclarator(objectPattern, j.identifier(imported)),
							])
						);
						injectAnxReactImport(pathToInjectAfter, local, imported, extra);
					} else {
						const local = propertyPath.node.value.name;
						const imported = propertyPath.node.key.name;
						injectAnxReactImport(pathToInjectAfter, local, imported, extra);
					}
				});

				j(variablePath.parent).replaceWith();
			});

		// find and modify all regular variables
		source
			.find(j.VariableDeclarator)
			.filter((path) => path.node && path.node.init.object && path.node.init.object.name  === local)
			.forEach((path) => {
				const local = path.node.id.name;
				const imported = path.node.init.property.name;
				injectAnxReactImport(pathToInjectAfter, local, imported, extra);
				j(path.parent).replaceWith();
			});
	};

	return source
		.find(j.ImportDeclaration)
		.filter((importPath) => importPath.node.source.value === 'anx-react')
		.forEach((importPath) => {

			// import * as anxReact from 'anx-react';
			j(importPath).find(j.ImportNamespaceSpecifier).forEach((defaultPath) => {
				const local = defaultPath.node.local.name;

				modifyAllVariables(importPath, local);

				j(defaultPath.parent).remove(); // get rid of the * import
			});

			// import { ... } from 'anx-react';
			j(importPath).find(j.ImportSpecifier).forEach((path) => {
				const imported = path.node.imported.name;
				const local = path.node.local.name;

				if (imported === 'lucid') {
					modifyAllVariables(importPath, local, 'lucid');
				}

				if (imported === 'volatile') {
					modifyAllVariables(importPath, local, 'volatile');
				}

				injectAnxReactImport(importPath, local);
			});

			j(importPath).replaceWith();
		})
		.toSource({
			quote: 'single',
			useTabs: true,
		});
};
