<?php
class Kwf_Ext_Assets_Provider extends Kwf_Assets_Provider_Abstract
{
    private static function _getAliasClasses()
    {
        static $classes;
        if (isset($classes)) return $classes;
        $p = VENDOR_PATH.'/bower_components/extjs';
        $classes = array_merge(
            self::_getAliasClassesForPath($p.'/src', $p.'/src'),
            self::_getAliasClassesForPath($p.'/examples/ux', $p.'/examples')
        );
        return $classes;
    }

    private static function _getAliasClassesForPath($path, $stripPath)
    {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path), RecursiveIteratorIterator::LEAVES_ONLY);
        foreach ($it as $i) {
            if (substr($i->getPathname(), -3) != '.js') continue;
            $depName = 'Ext4.'.str_replace(array('/', '\\'), '.', substr($i->getPathname(), strlen($stripPath)+1, -3));
            $fileContents = file_get_contents($i->getPathname());
            if (preg_match_all('#^\s*(//|\*) @(class|alternateClassName|define) ([a-zA-Z0-9\./]+)\s*$#m', $fileContents, $m)) {
                foreach ($m[3] as $cls) {
                    $classes[$cls] = $depName;
                }
            }

            // remove comments to avoid dependencies from docs/examples
            $fileContents = preg_replace('!/\*[^*]*\*+([^/][^*]*\*+)*'.'/!', '', $fileContents);

            if (preg_match_all('#Ext\.define\(\s*([\'"])([^\'"]+)\1#', $fileContents, $m)) {
                foreach ($m[2] as $cls) {
                    $classes[$cls] = $depName;
                }
            }
            if (preg_match_all('#^\s*(alternateClassName|alias)\s*:\s*\'([a-zA-Z0-9\.]+)\'\s*,?\s*$#m', $fileContents, $m)) {
                foreach ($m[2] as $i) {
                    $classes[$i] = $depName;
                }
            }
            if (preg_match_all('#^\s*(alternateClassName|alias)\s*:\s*\[([^\]]+)\]\s*,?\s*$#m', $fileContents, $m)) {
                foreach ($m[2] as $j) {
                    if (preg_match_all('#\'([a-zA-Z0-9\._]+)\'#', $j, $m2)) {
                        foreach ($m2[1] as $i) {
                            $classes[$i] = $depName;
                        }
                    }
                }

            }
        }
        return $classes;
    }

    public function getDependency($dependencyName)
    {
        /*if ($dependencyName == 'Ext4Corex') {

            $files = array(
                'Ext4.class.Loader'
            );
            foreach ($files as $f) {
                $d = $this->_providerList->findDependency($f);
                if (!$d) throw new Kwf_Exception("Can't resolve dependency: extend $cls");
                $deps[] = $d;
            }
            return new Kwf_Assets_Dependency_Dependencies($deps, $dependencyName);
        } else*/
        if (substr($dependencyName, 0, 4) == 'Ext4') {
            $class = substr($dependencyName, 4);
            if (substr($class, 0, 4)=='.ux.') {
                $file = '/examples'.str_replace('.', '/', $class).'.js';
            } else {
                $file = '/src'.str_replace('.', '/', $class).'.js';
            }
            if (!file_exists(VENDOR_PATH.'/bower_components/extjs'.$file)) return null;
            if ($file == VENDOR_PATH.'/bower_components/extjs/src/lang/Error.js') {
                return new Kwf_Assets_Dependency_File_Js('kwfext/Error.js');
            }
            return new Kwf_Ext_Assets_JsDependency('ext'.$file);
        }
    }

    public function getDependenciesForDependency(Kwf_Assets_Dependency_Abstract $dependency)
    {
        if (!$dependency instanceof Kwf_Assets_Dependency_File_Js && !$dependency instanceof Kwf_Ext_Assets_JsDependency) {
            return array();
        }
        $deps = array(
            Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_REQUIRES => array(),
            Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_USES => array(),
        );

        $fileContents = file_get_contents($dependency->getAbsoluteFileName());

        // remove comments to avoid dependencies from docs/examples
        $fileContents = preg_replace('!/\*[^*]*\*+([^/][^*]*\*+)*'.'/!', '', $fileContents);


        $aliasClasses = self::_getAliasClasses();

        if (preg_match_all('#^\s*'.'// @require\s+([a-zA-Z0-9\./\-_]+)\s*$#m', $fileContents, $m)) {
            foreach ($m[1] as $f) {
                if (substr($f, -3) == '.js') {
                    $f = substr($f, 0, -3);
                    $curFile = $dependency->getFileNameWithType();
                    $curFile = substr($curFile, 0, strrpos($curFile, '/'));
                    while (substr($f, 0, 3) == '../') {
                        $f = substr($f, 3);
                        $curFile = substr($curFile, 0, strrpos($curFile, '/', -2));
                    }
                    $f = str_replace('/', '.', $curFile.'/'.$f);
                    if (substr($f, 0, 8) == 'ext.src.') {
                        $f = 'Ext4.'.substr($f, 8);
                    }
                } else {
                    //ignore, that is handled by Kwf_Assets_Provider_AtRequires
                    continue;
                }

                if ($dependency->getFileNameWithType() == 'ext/src/util/Offset.js') {
                    if ($f == 'Ext4.dom.CompositeElement') {
                        $f = null;
                    }
                }

                if ($f) {
                    $d = $this->_providerList->findDependency($f);
                    if (!$d) throw new Kwf_Exception("Can't resolve dependency: require $f");
                    $deps[Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_REQUIRES][] = $d;
                }
            }
        }

        $classes = array(
            Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_USES => array(),
            Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_REQUIRES => array(),
        );
        if (preg_match('#Ext4?\.require\(\s*\'([a-zA-Z0-9\.]+)\'#', $fileContents, $m)) {
            $classes['requires'][] = $m[1];
        }
        if (preg_match('#Ext4?\.require\(\s*\[([^]]+\])#', $fileContents, $m)) {
            if (preg_match_all('#\'([a-zA-Z0-9\._]+)\'#', $m[1], $m2)) {
                $classes['requires'] = array_merge($classes['requires'], $m2[1]);
            }
        }

        if (preg_match('#Ext4?\.define\(\s*[\'"]#', $fileContents, $m)) {
            if (preg_match_all('#^\s*(extend|override|requires|mixins|uses)\s*:\s*\'([a-zA-Z0-9\.]+)\'\s*,?\s*$#m', $fileContents, $m)) {
                foreach ($m[2] as $k=>$cls) {
                    $type = ($m[1][$k] == 'uses' ? Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_USES : Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_REQUIRES);
                    $classes[$type][] = $cls;
                }
            }

            if (preg_match_all('#^\s*(requires|mixins|uses)\s*:\s*(\[.+?\]|{.+?})\s*,?\s*$#ms', $fileContents, $m)) {
                foreach ($m[2] as $k=>$i) {
                    $type = ($m[1][$k] == 'uses' ? Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_USES : Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_REQUIRES);
                    if (preg_match_all('#\'([a-zA-Z0-9\._]+)\'#', $i, $m2)) {
                        $classes[$type] = array_merge($classes[$type], $m2[1]);
                    }
                }
            }

            //this should probably only be done for relevant classes, ie. layout for panel, proxy for model etc
            if (preg_match_all('#^\s*(proxy|layout|reader|writer|componentLayout)\s*:\s*\'([a-zA-Z0-9\.]+)\'\s*,?\s*$#m', $fileContents, $m)) {
                foreach ($m[2] as $k=>$cls) {
                    $type = Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_REQUIRES;
                    $t = $m[1][$k];
                    $t = ($t == 'componentLayout') ? 'layout' : $t;
                    $classes[$type][] = $aliasClasses[$t.'.'.$cls];
                }
            }
            if (preg_match_all('#^\s*(proxy|layout|reader|writer|componentLayout)\s*:\s*{\s*type\s*:\s*\'([a-zA-Z0-9\.]+)\'#m', $fileContents, $m)) {
                foreach ($m[2] as $k=>$cls) {
                    $type = Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_REQUIRES;
                    $t = $m[1][$k];
                    $t = ($t == 'componentLayout') ? 'layout' : $t;
                    $classes[$type][] = $aliasClasses[$t.'.'.$cls];
                }
            }
        }

        foreach ($classes as $type=>$i) {
            foreach ($i as $cls) {
                if (substr($cls, 0, 4) == 'Ext.') {
                    $cls = 'Ext4.'.substr($cls, 4);
                }
                $d = $this->_providerList->findDependency($cls);
                if (!$d) throw new Kwf_Exception("Can't resolve dependency: extend $cls for $dependency");
                $deps[$type][] = $d;
            }
        }

        if ($dependency->getFileNameWithType() == 'ext/src/panel/Panel.js') {
            //$deps[Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_REQUIRES][] = new Kwf_Ext_Assets_CssDependency('ext/resources/ext-theme-classic-sandbox/ext-theme-classic-all.css');
            $deps[Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_REQUIRES][] = new Kwf_Ext_Assets_CssDependency('ext/resources/ext-theme-neptune/ext-theme-neptune-all.css');
        }
        if ($dependency->getFileNameWithType() == 'ext/src/data/Model.js') {
            $deps[Kwf_Assets_Dependency_Abstract::DEPENDENCY_TYPE_REQUIRES][] = $this->_providerList->findDependency('Ext4.data.proxy.Ajax');
        }

        return $deps;
    }

    public function getDependencyNameByAlias($aliasDependencyName)
    {
        if (substr($aliasDependencyName, 0, 5) == 'Ext4.') {
            $aliasDependencyName = 'Ext.'.substr($aliasDependencyName, 5);
        }

        if (substr($aliasDependencyName, 0, 4) == 'Ext.') {
            $aliasClasses = self::_getAliasClasses();
            if (isset($aliasClasses[$aliasDependencyName])) {
                $aliasDependencyName = $aliasClasses[$aliasDependencyName];
                return $aliasDependencyName;
            }
        }
    }
}
